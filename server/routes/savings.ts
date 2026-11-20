import { Router } from 'express';
import type { Response } from 'express';
import { db } from '../db.ts';
import { requireAuth } from '../middleware/auth.ts';
import type { AuthenticatedRequest } from '../middleware/auth.ts';

const router = Router();
router.use(requireAuth);

router.get('/', (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const statusFilter = req.query.status ? String(req.query.status) : '';

    let query =
      'SELECT id, goal_name, target_amount, current_amount, target_date, status, created_at, updated_at FROM savings_goals WHERE user_id = ?';
    const params: Array<string | number> = [userId];

    if (statusFilter === 'pending' || statusFilter === 'completed') {
      query += ' AND status = ?';
      params.push(statusFilter);
    }

    query += " ORDER BY CASE WHEN status = 'pending' THEN 0 ELSE 1 END, target_date ASC";

    const rows = db.prepare(query).all(...params) as Array<{
      id: number;
      goal_name: string;
      target_amount: number;
      current_amount: number;
      target_date: string;
      status: 'pending' | 'completed';
      created_at: string;
      updated_at: string;
    }>;

    const goals = rows.map((g) => {
      const target = Number(g.target_amount);
      const current = Number(g.current_amount);
      const progress = target > 0 ? Math.min(100, Math.round((current / target) * 1000) / 10) : 0;
      return {
        ...g,
        id: Number(g.id),
        target_amount: target,
        current_amount: current,
        progress_percent: progress,
      };
    });

    const totalSaved = goals.reduce((acc, g) => acc + g.current_amount, 0);
    const totalTarget = goals.reduce((acc, g) => acc + g.target_amount, 0);

    res.json({
      goals,
      summary: {
        total_saved: Math.round(totalSaved * 100) / 100,
        total_target: Math.round(totalTarget * 100) / 100,
        completed_count: goals.filter((g) => g.status === 'completed').length,
        pending_count: goals.filter((g) => g.status === 'pending').length,
      },
    });
  } catch (err) {
    console.error('Get savings goals error:', err);
    res.status(500).json({ error: 'Failed to load savings goals.' });
  }
});

router.post('/', (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const goalName = String(req.body?.goal_name || '').trim();
    const targetAmount = Number(req.body?.target_amount);
    const currentAmount = Number(req.body?.current_amount || 0);
    const targetDate = String(req.body?.target_date || '').trim();

    if (goalName.length < 2) {
      res.status(400).json({ error: 'Goal name must be at least 2 characters.' });
      return;
    }
    if (!Number.isFinite(targetAmount) || targetAmount <= 0) {
      res.status(400).json({ error: 'Target amount must be greater than zero.' });
      return;
    }
    if (!Number.isFinite(currentAmount) || currentAmount < 0) {
      res.status(400).json({ error: 'Current saved amount cannot be negative.' });
      return;
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(targetDate)) {
      res.status(400).json({ error: 'Target date must be in YYYY-MM-DD format.' });
      return;
    }

    const status = currentAmount >= targetAmount ? 'completed' : 'pending';
    const result = db
      .prepare(
        `INSERT INTO savings_goals (user_id, goal_name, target_amount, current_amount, target_date, status)
         VALUES (?, ?, ?, ?, ?, ?)`
      )
      .run(
        userId,
        goalName,
        Math.round(targetAmount * 100) / 100,
        Math.round(currentAmount * 100) / 100,
        targetDate,
        status
      );

    const created = db
      .prepare('SELECT * FROM savings_goals WHERE id = ? AND user_id = ?')
      .get(Number(result.lastInsertRowid), userId);

    res.status(201).json({ goal: created });
  } catch (err) {
    console.error('Create savings goal error:', err);
    res.status(500).json({ error: 'Failed to create savings goal.' });
  }
});

router.put('/:id', (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const goalId = Number(req.params.id);

    const existing = db
      .prepare('SELECT * FROM savings_goals WHERE id = ? AND user_id = ?')
      .get(goalId, userId) as
      | {
          id: number;
          goal_name: string;
          target_amount: number;
          current_amount: number;
          target_date: string;
        }
      | undefined;

    if (!existing) {
      res.status(404).json({ error: 'Savings goal not found.' });
      return;
    }

    const addAmount = req.body?.add_amount !== undefined ? Number(req.body.add_amount) : null;
    let goalName = req.body?.goal_name !== undefined ? String(req.body.goal_name).trim() : existing.goal_name;
    let targetAmount =
      req.body?.target_amount !== undefined ? Number(req.body.target_amount) : Number(existing.target_amount);
    let currentAmount =
      addAmount !== null
        ? Number(existing.current_amount) + addAmount
        : req.body?.current_amount !== undefined
        ? Number(req.body.current_amount)
        : Number(existing.current_amount);
    let targetDate =
      req.body?.target_date !== undefined ? String(req.body.target_date).trim() : existing.target_date;

    if (goalName.length < 2) {
      res.status(400).json({ error: 'Goal name must be at least 2 characters.' });
      return;
    }
    if (!Number.isFinite(targetAmount) || targetAmount <= 0) {
      res.status(400).json({ error: 'Target amount must be greater than zero.' });
      return;
    }
    if (!Number.isFinite(currentAmount) || currentAmount < 0) {
      res.status(400).json({ error: 'Saved amount cannot be negative.' });
      return;
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(targetDate)) {
      res.status(400).json({ error: 'Target date must be in YYYY-MM-DD format.' });
      return;
    }

    const status = currentAmount >= targetAmount ? 'completed' : 'pending';
    db.prepare(
      `UPDATE savings_goals
       SET goal_name = ?, target_amount = ?, current_amount = ?, target_date = ?, status = ?, updated_at = datetime('now')
       WHERE id = ? AND user_id = ?`
    ).run(
      goalName,
      Math.round(targetAmount * 100) / 100,
      Math.round(currentAmount * 100) / 100,
      targetDate,
      status,
      goalId,
      userId
    );

    const updated = db
      .prepare('SELECT * FROM savings_goals WHERE id = ? AND user_id = ?')
      .get(goalId, userId);

    res.json({ goal: updated });
  } catch (err) {
    console.error('Update savings goal error:', err);
    res.status(500).json({ error: 'Failed to update savings goal.' });
  }
});

router.delete('/:id', (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const goalId = Number(req.params.id);

    const result = db
      .prepare('DELETE FROM savings_goals WHERE id = ? AND user_id = ?')
      .run(goalId, userId);

    if (Number(result.changes) === 0) {
      res.status(404).json({ error: 'Savings goal not found.' });
      return;
    }

    res.json({ message: 'Savings goal deleted.' });
  } catch (err) {
    console.error('Delete savings goal error:', err);
    res.status(500).json({ error: 'Failed to delete savings goal.' });
  }
});

export default router;
