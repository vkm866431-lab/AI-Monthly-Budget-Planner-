import { Router } from 'express';
import type { Response } from 'express';
import { db, hashPassword, seedSampleFinanceData, verifyPassword } from '../db.ts';
import { requireAuth } from '../middleware/auth.ts';
import type { AuthenticatedRequest } from '../middleware/auth.ts';

const router = Router();
router.use(requireAuth);

const CURRENCY_SYMBOLS: Record<string, string> = {
  INR: '₹',
  USD: '$',
  EUR: '€',
  GBP: '£',
};

router.get('/', (req: AuthenticatedRequest, res: Response) => {
  const userId = req.user!.id;
  const settings = db
    .prepare(
      'SELECT currency, currency_symbol, date_format, theme, notify_budget_80, notify_budget_exceeded, notify_goal_complete FROM settings WHERE user_id = ?'
    )
    .get(userId);
  const categories = db
    .prepare('SELECT id, name, type, color, is_default FROM categories WHERE user_id = ? ORDER BY type, name')
    .all(userId);
  res.json({ user: req.user, settings, categories });
});

router.get('/categories', (req: AuthenticatedRequest, res: Response) => {
  const userId = req.user!.id;
  const type = req.query.type ? String(req.query.type) : '';
  const rows =
    type === 'income' || type === 'expense'
      ? db
          .prepare('SELECT id, name, type, color, is_default FROM categories WHERE user_id = ? AND type = ? ORDER BY name')
          .all(userId, type)
      : db
          .prepare('SELECT id, name, type, color, is_default FROM categories WHERE user_id = ? ORDER BY type, name')
          .all(userId);
  res.json({ categories: rows });
});

router.post('/categories', (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const name = String(req.body?.name || '').trim();
    const type = String(req.body?.type || '');
    const color = String(req.body?.color || '#2563EB').trim();

    if (name.length < 2) {
      res.status(400).json({ error: 'Category name must be at least 2 characters.' });
      return;
    }
    if (type !== 'income' && type !== 'expense') {
      res.status(400).json({ error: 'Category type must be income or expense.' });
      return;
    }

    const result = db
      .prepare('INSERT INTO categories (user_id, name, type, color, is_default) VALUES (?, ?, ?, ?, 0)')
      .run(userId, name, type, color);

    const created = db
      .prepare('SELECT id, name, type, color, is_default FROM categories WHERE id = ?')
      .get(Number(result.lastInsertRowid));

    res.status(201).json({ category: created });
  } catch (err) {
    console.error('Create category error:', err);
    res.status(409).json({ error: 'Category already exists or invalid data.' });
  }
});

router.put('/profile', (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const fullName = String(req.body?.full_name || '').trim();
    const email = String(req.body?.email || '').trim().toLowerCase();
    const phone = String(req.body?.phone ?? req.user!.phone ?? '').trim();
    const role = String(req.body?.role || req.user!.role).trim();

    if (fullName.length < 2) {
      res.status(400).json({ error: 'Full name must be at least 2 characters.' });
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      res.status(400).json({ error: 'Please enter a valid email address.' });
      return;
    }

    const conflict = db
      .prepare('SELECT id FROM users WHERE email = ? AND id != ?')
      .get(email, userId);
    if (conflict) {
      res.status(409).json({ error: 'Email is already in use by another account.' });
      return;
    }

    db.prepare('UPDATE users SET full_name = ?, email = ?, phone = ?, role = ? WHERE id = ?').run(
      fullName,
      email,
      phone,
      role,
      userId
    );

    const updatedUser = db
      .prepare('SELECT id, full_name, email, phone, role, created_at FROM users WHERE id = ?')
      .get(userId);

    res.json({ user: updatedUser });
  } catch (err) {
    console.error('Update profile error:', err);
    res.status(500).json({ error: 'Failed to update profile.' });
  }
});

router.put('/password', (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const currentPassword = String(req.body?.current_password || '');
    const newPassword = String(req.body?.new_password || '');

    if (newPassword.length < 8) {
      res.status(400).json({ error: 'New password must be at least 8 characters.' });
      return;
    }

    const row = db
      .prepare('SELECT password_hash FROM users WHERE id = ?')
      .get(userId) as { password_hash: string } | undefined;

    if (!row || !verifyPassword(currentPassword, row.password_hash)) {
      res.status(400).json({ error: 'Current password is incorrect.' });
      return;
    }

    const newHash = hashPassword(newPassword);
    db.prepare('UPDATE users SET password_hash = ? WHERE id = ?').run(newHash, userId);
    res.json({ message: 'Password updated successfully.' });
  } catch (err) {
    console.error('Update password error:', err);
    res.status(500).json({ error: 'Failed to change password.' });
  }
});

router.put('/preferences', (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const currency = String(req.body?.currency || 'INR').toUpperCase();
    const dateFormat = String(req.body?.date_format || 'DD/MM/YYYY');
    const theme = req.body?.theme === 'dark' ? 'dark' : 'light';
    const notify80 = req.body?.notify_budget_80 === false || req.body?.notify_budget_80 === 0 ? 0 : 1;
    const notifyExceeded =
      req.body?.notify_budget_exceeded === false || req.body?.notify_budget_exceeded === 0 ? 0 : 1;
    const notifyGoal =
      req.body?.notify_goal_complete === false || req.body?.notify_goal_complete === 0 ? 0 : 1;

    const symbol = CURRENCY_SYMBOLS[currency] || '₹';
    const validFormats = new Set(['DD/MM/YYYY', 'MM/DD/YYYY', 'YYYY-MM-DD']);
    const safeFormat = validFormats.has(dateFormat) ? dateFormat : 'DD/MM/YYYY';

    db.prepare(
      `INSERT INTO settings (user_id, currency, currency_symbol, date_format, theme, notify_budget_80, notify_budget_exceeded, notify_goal_complete, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
       ON CONFLICT(user_id) DO UPDATE SET
         currency = excluded.currency,
         currency_symbol = excluded.currency_symbol,
         date_format = excluded.date_format,
         theme = excluded.theme,
         notify_budget_80 = excluded.notify_budget_80,
         notify_budget_exceeded = excluded.notify_budget_exceeded,
         notify_goal_complete = excluded.notify_goal_complete,
         updated_at = datetime('now')`
    ).run(userId, currency, symbol, safeFormat, theme, notify80, notifyExceeded, notifyGoal);

    const updated = db
      .prepare(
        'SELECT currency, currency_symbol, date_format, theme, notify_budget_80, notify_budget_exceeded, notify_goal_complete FROM settings WHERE user_id = ?'
      )
      .get(userId);

    res.json({ settings: updated });
  } catch (err) {
    console.error('Update preferences error:', err);
    res.status(500).json({ error: 'Failed to update preferences.' });
  }
});

router.post('/seed-sample', (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const month = typeof req.body?.month === 'string' ? req.body.month : undefined;
    seedSampleFinanceData(userId, month);
    res.json({ message: 'Sample semester financial records loaded into SQLite.' });
  } catch (err) {
    console.error('Seed sample error:', err);
    res.status(500).json({ error: 'Failed to load sample records.' });
  }
});

router.delete('/clear-data', (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    db.prepare('DELETE FROM transactions WHERE user_id = ?').run(userId);
    db.prepare('DELETE FROM budgets WHERE user_id = ?').run(userId);
    db.prepare('DELETE FROM savings_goals WHERE user_id = ?').run(userId);
    res.json({ message: 'All financial records have been cleared.' });
  } catch (err) {
    console.error('Clear data error:', err);
    res.status(500).json({ error: 'Failed to clear financial data.' });
  }
});

export default router;
