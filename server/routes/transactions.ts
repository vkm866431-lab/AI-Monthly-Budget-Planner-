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
    const type = req.query.type ? String(req.query.type) : '';
    const categoryId = req.query.category_id ? Number(req.query.category_id) : 0;
    const month = req.query.month ? String(req.query.month) : '';
    const startDate = req.query.start_date ? String(req.query.start_date) : '';
    const endDate = req.query.end_date ? String(req.query.end_date) : '';
    const search = req.query.search ? String(req.query.search).trim().toLowerCase() : '';
    const paymentMethod = req.query.payment_method ? String(req.query.payment_method).trim() : '';
    const sortBy = req.query.sort_by === 'amount' ? 't.amount' : 't.date';
    const sortOrder = req.query.sort_order === 'asc' ? 'ASC' : 'DESC';
    const page = Math.max(1, Number(req.query.page || 1));
    const limit = Math.min(100, Math.max(1, Number(req.query.limit || 20)));
    const offset = (page - 1) * limit;

    const conditions: string[] = ['t.user_id = ?'];
    const params: Array<string | number> = [userId];

    if (type === 'income' || type === 'expense') {
      conditions.push('t.type = ?');
      params.push(type);
    }
    if (categoryId > 0) {
      conditions.push('t.category_id = ?');
      params.push(categoryId);
    }
    if (/^\d{4}-\d{2}$/.test(month)) {
      conditions.push("substr(t.date, 1, 7) = ?");
      params.push(month);
    }
    if (/^\d{4}-\d{2}-\d{2}$/.test(startDate)) {
      conditions.push('t.date >= ?');
      params.push(startDate);
    }
    if (/^\d{4}-\d{2}-\d{2}$/.test(endDate)) {
      conditions.push('t.date <= ?');
      params.push(endDate);
    }
    if (paymentMethod) {
      conditions.push('LOWER(t.source_or_method) = ?');
      params.push(paymentMethod.toLowerCase());
    }
    if (search) {
      conditions.push(
        '(LOWER(t.description) LIKE ? OR LOWER(t.source_or_method) LIKE ? OR LOWER(c.name) LIKE ?)'
      );
      const like = `%${search}%`;
      params.push(like, like, like);
    }

    const whereClause = conditions.join(' AND ');

    const countRow = db
      .prepare(
        `SELECT COUNT(*) as total,
                COALESCE(SUM(CASE WHEN t.type = 'income' THEN t.amount ELSE 0 END), 0) as total_income,
                COALESCE(SUM(CASE WHEN t.type = 'expense' THEN t.amount ELSE 0 END), 0) as total_expense
         FROM transactions t
         JOIN categories c ON c.id = t.category_id
         WHERE ${whereClause}`
      )
      .get(...params) as { total: number; total_income: number; total_expense: number };

    const rows = db
      .prepare(
        `SELECT t.id, t.user_id, t.category_id, t.type, t.amount, t.date, t.source_or_method,
                t.description, t.created_at, t.updated_at,
                c.name as category_name, c.color as category_color
         FROM transactions t
         JOIN categories c ON c.id = t.category_id
         WHERE ${whereClause}
         ORDER BY ${sortBy} ${sortOrder}, t.id DESC
         LIMIT ? OFFSET ?`
      )
      .all(...params, limit, offset);

    res.json({
      transactions: rows,
      pagination: {
        page,
        limit,
        total: Number(countRow.total),
        total_pages: Math.max(1, Math.ceil(Number(countRow.total) / limit)),
      },
      summary: {
        total_income: Number(countRow.total_income),
        total_expense: Number(countRow.total_expense),
      },
    });
  } catch (err) {
    console.error('Get transactions error:', err);
    res.status(500).json({ error: 'Failed to load transactions.' });
  }
});

router.post('/', (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const type = String(req.body?.type || '');
    const categoryId = Number(req.body?.category_id);
    const amount = Number(req.body?.amount);
    const date = String(req.body?.date || '').trim();
    const sourceOrMethod = String(req.body?.source_or_method || '').trim();
    const description = String(req.body?.description || '').trim();

    if (type !== 'income' && type !== 'expense') {
      res.status(400).json({ error: 'Transaction type must be income or expense.' });
      return;
    }
    if (!Number.isFinite(amount) || amount <= 0) {
      res.status(400).json({ error: 'Amount must be greater than zero.' });
      return;
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      res.status(400).json({ error: 'Date must be in YYYY-MM-DD format.' });
      return;
    }

    const cat = db
      .prepare('SELECT id, type FROM categories WHERE id = ? AND user_id = ?')
      .get(categoryId, userId) as { id: number; type: string } | undefined;

    if (!cat || cat.type !== type) {
      res.status(400).json({ error: 'Invalid category selected for this transaction type.' });
      return;
    }

    const result = db
      .prepare(
        `INSERT INTO transactions (user_id, category_id, type, amount, date, source_or_method, description)
         VALUES (?, ?, ?, ?, ?, ?, ?)`
      )
      .run(userId, categoryId, type, Math.round(amount * 100) / 100, date, sourceOrMethod, description);

    const created = db
      .prepare(
        `SELECT t.*, c.name as category_name, c.color as category_color
         FROM transactions t
         JOIN categories c ON c.id = t.category_id
         WHERE t.id = ? AND t.user_id = ?`
      )
      .get(Number(result.lastInsertRowid), userId);

    res.status(201).json({ transaction: created });
  } catch (err) {
    console.error('Create transaction error:', err);
    res.status(500).json({ error: 'Failed to save transaction.' });
  }
});

router.put('/:id', (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const txId = Number(req.params.id);

    const existing = db
      .prepare('SELECT id, type FROM transactions WHERE id = ? AND user_id = ?')
      .get(txId, userId) as { id: number; type: string } | undefined;

    if (!existing) {
      res.status(404).json({ error: 'Transaction not found.' });
      return;
    }

    const type = String(req.body?.type || existing.type);
    const categoryId = Number(req.body?.category_id);
    const amount = Number(req.body?.amount);
    const date = String(req.body?.date || '').trim();
    const sourceOrMethod = String(req.body?.source_or_method || '').trim();
    const description = String(req.body?.description || '').trim();

    if (type !== 'income' && type !== 'expense') {
      res.status(400).json({ error: 'Transaction type must be income or expense.' });
      return;
    }
    if (!Number.isFinite(amount) || amount <= 0) {
      res.status(400).json({ error: 'Amount must be greater than zero.' });
      return;
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      res.status(400).json({ error: 'Date must be in YYYY-MM-DD format.' });
      return;
    }

    const cat = db
      .prepare('SELECT id, type FROM categories WHERE id = ? AND user_id = ?')
      .get(categoryId, userId) as { id: number; type: string } | undefined;

    if (!cat || cat.type !== type) {
      res.status(400).json({ error: 'Invalid category selected.' });
      return;
    }

    db.prepare(
      `UPDATE transactions
       SET category_id = ?, type = ?, amount = ?, date = ?, source_or_method = ?, description = ?, updated_at = datetime('now')
       WHERE id = ? AND user_id = ?`
    ).run(categoryId, type, Math.round(amount * 100) / 100, date, sourceOrMethod, description, txId, userId);

    const updated = db
      .prepare(
        `SELECT t.*, c.name as category_name, c.color as category_color
         FROM transactions t
         JOIN categories c ON c.id = t.category_id
         WHERE t.id = ? AND t.user_id = ?`
      )
      .get(txId, userId);

    res.json({ transaction: updated });
  } catch (err) {
    console.error('Update transaction error:', err);
    res.status(500).json({ error: 'Failed to update transaction.' });
  }
});

router.delete('/:id', (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const txId = Number(req.params.id);

    const result = db
      .prepare('DELETE FROM transactions WHERE id = ? AND user_id = ?')
      .run(txId, userId);

    if (Number(result.changes) === 0) {
      res.status(404).json({ error: 'Transaction not found.' });
      return;
    }

    res.json({ message: 'Transaction deleted.' });
  } catch (err) {
    console.error('Delete transaction error:', err);
    res.status(500).json({ error: 'Failed to delete transaction.' });
  }
});

export default router;
