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
    const now = new Date();
    const defaultMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    const month = /^\d{4}-\d{2}$/.test(String(req.query.month || ''))
      ? String(req.query.month)
      : defaultMonth;

    const rows = db
      .prepare(
        `SELECT b.id, b.category_id, b.month, b.limit_amount, b.created_at, b.updated_at,
                c.name as category_name, c.color as category_color,
                COALESCE(SUM(t.amount), 0) as spent_amount
         FROM budgets b
         JOIN categories c ON c.id = b.category_id
         LEFT JOIN transactions t
           ON t.category_id = b.category_id
          AND t.user_id = b.user_id
          AND t.type = 'expense'
          AND substr(t.date, 1, 7) = b.month
         WHERE b.user_id = ? AND b.month = ?
         GROUP BY b.id
         ORDER BY (COALESCE(SUM(t.amount), 0) / b.limit_amount) DESC, c.name ASC`
      )
      .all(userId, month) as Array<{
      id: number;
      category_id: number;
      month: string;
      limit_amount: number;
      category_name: string;
      category_color: string;
      spent_amount: number;
    }>;

    const budgets = rows.map((row) => {
      const limit = Number(row.limit_amount);
      const spent = Number(row.spent_amount);
      const remaining = Math.round((limit - spent) * 100) / 100;
      const utilization = limit > 0 ? Math.round((spent / limit) * 1000) / 10 : 0;
      const status =
        utilization > 100 ? 'exceeded' : utilization >= 80 ? 'warning' : 'normal';
      return {
        ...row,
        id: Number(row.id),
        category_id: Number(row.category_id),
        limit_amount: limit,
        spent_amount: spent,
        remaining_amount: remaining,
        utilization_percent: utilization,
        status,
      };
    });

    const totalBudgeted = budgets.reduce((acc, b) => acc + b.limit_amount, 0);
    const totalSpent = budgets.reduce((acc, b) => acc + b.spent_amount, 0);

    res.json({
      month,
      budgets,
      summary: {
        total_budgeted: Math.round(totalBudgeted * 100) / 100,
        total_spent: Math.round(totalSpent * 100) / 100,
        total_remaining: Math.round((totalBudgeted - totalSpent) * 100) / 100,
        overall_utilization:
          totalBudgeted > 0 ? Math.round((totalSpent / totalBudgeted) * 1000) / 10 : 0,
        warning_count: budgets.filter((b) => b.status === 'warning').length,
        exceeded_count: budgets.filter((b) => b.status === 'exceeded').length,
      },
    });
  } catch (err) {
    console.error('Get budgets error:', err);
    res.status(500).json({ error: 'Failed to load budgets.' });
  }
});

router.post('/', (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const categoryId = Number(req.body?.category_id);
    const month = String(req.body?.month || '').trim();
    const limitAmount = Number(req.body?.limit_amount);

    if (!/^\d{4}-\d{2}$/.test(month)) {
      res.status(400).json({ error: 'Month must be in YYYY-MM format.' });
      return;
    }
    if (!Number.isFinite(limitAmount) || limitAmount <= 0) {
      res.status(400).json({ error: 'Budget limit must be greater than zero.' });
      return;
    }

    const cat = db
      .prepare("SELECT id FROM categories WHERE id = ? AND user_id = ? AND type = 'expense'")
      .get(categoryId, userId);

    if (!cat) {
      res.status(400).json({ error: 'Invalid expense category selected.' });
      return;
    }

    const rounded = Math.round(limitAmount * 100) / 100;
    db.prepare(
      `INSERT INTO budgets (user_id, category_id, month, limit_amount)
       VALUES (?, ?, ?, ?)
       ON CONFLICT(user_id, category_id, month)
       DO UPDATE SET limit_amount = excluded.limit_amount, updated_at = datetime('now')`
    ).run(userId, categoryId, month, rounded);

    res.status(201).json({ message: 'Monthly budget saved.' });
  } catch (err) {
    console.error('Save budget error:', err);
    res.status(500).json({ error: 'Failed to save monthly budget.' });
  }
});

router.put('/:id', (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const budgetId = Number(req.params.id);
    const limitAmount = Number(req.body?.limit_amount);

    if (!Number.isFinite(limitAmount) || limitAmount <= 0) {
      res.status(400).json({ error: 'Budget limit must be greater than zero.' });
      return;
    }

    const result = db
      .prepare(
        "UPDATE budgets SET limit_amount = ?, updated_at = datetime('now') WHERE id = ? AND user_id = ?"
      )
      .run(Math.round(limitAmount * 100) / 100, budgetId, userId);

    if (Number(result.changes) === 0) {
      res.status(404).json({ error: 'Budget not found.' });
      return;
    }

    res.json({ message: 'Budget updated.' });
  } catch (err) {
    console.error('Update budget error:', err);
    res.status(500).json({ error: 'Failed to update budget.' });
  }
});

router.delete('/:id', (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const budgetId = Number(req.params.id);

    const result = db
      .prepare('DELETE FROM budgets WHERE id = ? AND user_id = ?')
      .run(budgetId, userId);

    if (Number(result.changes) === 0) {
      res.status(404).json({ error: 'Budget not found.' });
      return;
    }

    res.json({ message: 'Budget removed.' });
  } catch (err) {
    console.error('Delete budget error:', err);
    res.status(500).json({ error: 'Failed to delete budget.' });
  }
});

export default router;
