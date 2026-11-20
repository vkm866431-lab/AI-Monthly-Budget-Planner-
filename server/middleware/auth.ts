import type { NextFunction, Request, Response } from 'express';
import crypto from 'node:crypto';
import { db } from '../db.ts';

export interface AuthenticatedUser {
  id: number;
  full_name: string;
  email: string;
  phone: string;
  role: string;
  created_at: string;
}

export interface AuthenticatedRequest extends Request {
  user?: AuthenticatedUser;
  sessionToken?: string;
}

export const SESSION_COOKIE_NAME = 'mbp_session';

export function createSession(userId: number, days = 7): string {
  const token = crypto.randomBytes(32).toString('hex');
  const expiresAt = new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString();
  db.prepare('INSERT INTO sessions (token, user_id, expires_at) VALUES (?, ?, ?)').run(
    token,
    userId,
    expiresAt
  );
  return token;
}

export function deleteSession(token: string): void {
  db.prepare('DELETE FROM sessions WHERE token = ?').run(token);
}

export function getUserFromToken(token: string): AuthenticatedUser | null {
  if (!token) return null;
  const row = db
    .prepare(
      `SELECT u.id, u.full_name, u.email, u.phone, u.role, u.created_at, s.expires_at
       FROM sessions s
       JOIN users u ON u.id = s.user_id
       WHERE s.token = ?`
    )
    .get(token) as (AuthenticatedUser & { expires_at: string }) | undefined;

  if (!row) return null;

  if (new Date(row.expires_at).getTime() < Date.now()) {
    deleteSession(token);
    return null;
  }

  return {
    id: Number(row.id),
    full_name: row.full_name,
    email: row.email,
    phone: row.phone || '',
    role: row.role,
    created_at: row.created_at,
  };
}

export function requireAuth(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): void {
  const cookieToken = req.cookies?.[SESSION_COOKIE_NAME] as string | undefined;
  const authHeader = req.headers.authorization;
  const bearerToken =
    authHeader && authHeader.startsWith('Bearer ') ? authHeader.slice(7).trim() : undefined;

  const token = cookieToken || bearerToken;
  if (!token) {
    res.status(401).json({ error: 'Authentication required. Please sign in.' });
    return;
  }

  const user = getUserFromToken(token);
  if (!user) {
    res.status(401).json({ error: 'Session expired or invalid. Please sign in again.' });
    return;
  }

  req.user = user;
  req.sessionToken = token;
  next();
}
