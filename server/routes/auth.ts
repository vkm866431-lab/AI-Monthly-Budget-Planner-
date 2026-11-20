import { Router } from 'express';
import type { Request, Response } from 'express';
import { db, hashPassword, seedSampleFinanceData, seedUserDefaults, verifyPassword } from '../db.ts';
import {
  createSession,
  deleteSession,
  requireAuth,
  SESSION_COOKIE_NAME,
} from '../middleware/auth.ts';
import type { AuthenticatedRequest } from '../middleware/auth.ts';

const router = Router();

function setSessionCookie(
  req: Request,
  res: Response,
  token: string,
  rememberMe = true
): void {
  const isSecure = req.secure || req.headers['x-forwarded-proto'] === 'https';
  res.cookie(SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: isSecure ? 'none' : 'lax',
    secure: isSecure,
    ...(rememberMe ? { maxAge: 30 * 24 * 60 * 60 * 1000 } : {}),
    path: '/',
  });
}

function getUserSettings(userId: number) {
  return db
    .prepare(
      'SELECT currency, currency_symbol, date_format, theme, notify_budget_80, notify_budget_exceeded, notify_goal_complete FROM settings WHERE user_id = ?'
    )
    .get(userId) as
    | {
        currency: string;
        currency_symbol: string;
        date_format: string;
        theme: string;
        notify_budget_80: number;
        notify_budget_exceeded: number;
        notify_goal_complete: number;
      }
    | undefined;
}

router.post('/register', (req: Request, res: Response) => {
  try {
    const fullName = String(req.body?.full_name || '').trim();
    const email = String(req.body?.email || '').trim().toLowerCase();
    const phone = String(req.body?.phone || '').trim();
    const password = String(req.body?.password || '');
    const role = String(req.body?.role || 'student').trim() || 'student';

    if (fullName.length < 2) {
      res.status(400).json({ error: 'Full name must be at least 2 characters.' });
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      res.status(400).json({ error: 'Please enter a valid email address.' });
      return;
    }
    if (phone && !/^[+\d\s()-]{7,20}$/.test(phone)) {
      res.status(400).json({ error: 'Please enter a valid phone number.' });
      return;
    }
    if (password.length < 8) {
      res.status(400).json({ error: 'Password must be at least 8 characters long.' });
      return;
    }

    const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(email);
    if (existing) {
      res.status(409).json({ error: 'An account with this email already exists.' });
      return;
    }

    const passwordHash = hashPassword(password);
    const result = db
      .prepare(
        'INSERT INTO users (full_name, email, phone, password_hash, role) VALUES (?, ?, ?, ?, ?)'
      )
      .run(fullName, email, phone, passwordHash, role);

    const userId = Number(result.lastInsertRowid);
    seedUserDefaults(userId);

    const user = db
      .prepare('SELECT id, full_name, email, phone, role, created_at FROM users WHERE id = ?')
      .get(userId);

    res.status(201).json({
      message: 'Account created successfully. Please sign in to continue.',
      user,
    });
  } catch (err) {
    console.error('Register error:', err);
    res.status(500).json({ error: 'Failed to create account. Please try again.' });
  }
});

router.post('/login', (req: Request, res: Response) => {
  try {
    const email = String(req.body?.email || '').trim().toLowerCase();
    const password = String(req.body?.password || '');
    const rememberMe = Boolean(req.body?.remember_me);

    if (!email || !password) {
      res.status(400).json({ error: 'Email and password are required.' });
      return;
    }

    const row = db
      .prepare(
        'SELECT id, full_name, email, phone, password_hash, role, created_at FROM users WHERE email = ?'
      )
      .get(email) as
      | {
          id: number;
          full_name: string;
          email: string;
          phone: string;
          password_hash: string;
          role: string;
          created_at: string;
        }
      | undefined;

    if (!row || !verifyPassword(password, row.password_hash)) {
      res.status(401).json({ error: 'Invalid email or password.' });
      return;
    }

    const userId = Number(row.id);
    const token = createSession(userId, rememberMe ? 30 : 1);
    setSessionCookie(req, res, token, rememberMe);

    const settings = getUserSettings(userId);

    res.json({
      token,
      user: {
        id: userId,
        full_name: row.full_name,
        email: row.email,
        phone: row.phone || '',
        role: row.role,
        created_at: row.created_at,
      },
      settings,
    });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Unable to sign in. Please try again.' });
  }
});

router.post('/demo', (req: Request, res: Response) => {
  try {
    const demoEmail = 'aarav.sharma@iitp.ac.in';
    let row = db
      .prepare('SELECT id, full_name, email, phone, role, created_at FROM users WHERE email = ?')
      .get(demoEmail) as
      | {
          id: number;
          full_name: string;
          email: string;
          phone: string;
          role: string;
          created_at: string;
        }
      | undefined;

    if (!row) {
      const passwordHash = hashPassword('IITP@2026');
      const result = db
        .prepare(
          'INSERT INTO users (full_name, email, phone, password_hash, role) VALUES (?, ?, ?, ?, ?)'
        )
        .run('Aarav Sharma', demoEmail, '+91 98765 43210', passwordHash, 'B.Tech Student · IIT Patna');
      const userId = Number(result.lastInsertRowid);
      seedSampleFinanceData(userId);
      row = db
        .prepare('SELECT id, full_name, email, phone, role, created_at FROM users WHERE id = ?')
        .get(userId) as typeof row;
    } else {
      const txCount = db
        .prepare('SELECT COUNT(*) as cnt FROM transactions WHERE user_id = ?')
        .get(Number(row.id)) as { cnt: number };
      if (Number(txCount.cnt) === 0) {
        seedSampleFinanceData(Number(row.id));
      }
    }

    const userId = Number(row!.id);
    const token = createSession(userId, 7);
    setSessionCookie(req, res, token, true);
    const settings = getUserSettings(userId);

    res.json({
      token,
      user: {
        id: userId,
        full_name: row!.full_name,
        email: row!.email,
        phone: row!.phone || '',
        role: row!.role,
        created_at: row!.created_at,
      },
      settings,
    });
  } catch (err) {
    console.error('Demo login error:', err);
    res.status(500).json({ error: 'Unable to launch demo session.' });
  }
});

router.post('/logout', (req: AuthenticatedRequest, res: Response) => {
  const cookieToken = req.cookies?.[SESSION_COOKIE_NAME] as string | undefined;
  const authHeader = req.headers.authorization;
  const bearerToken =
    authHeader && authHeader.startsWith('Bearer ') ? authHeader.slice(7).trim() : undefined;
  const token = cookieToken || bearerToken;

  if (token) {
    deleteSession(token);
  }
  res.clearCookie(SESSION_COOKIE_NAME, { path: '/' });
  res.json({ message: 'Signed out successfully.' });
});

router.get('/me', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  const userId = req.user!.id;
  const settings = getUserSettings(userId);
  res.json({ user: req.user, settings });
});

export default router;
