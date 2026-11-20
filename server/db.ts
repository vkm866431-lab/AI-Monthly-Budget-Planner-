import { DatabaseSync } from 'node:sqlite';
import crypto from 'node:crypto';
import path from 'node:path';

const DB_PATH = process.env.DATABASE_PATH
  ? path.resolve(process.env.DATABASE_PATH)
  : path.resolve(process.cwd(), 'budget_planner.db');

export const db = new DatabaseSync(DB_PATH);

export interface DefaultCategorySeed {
  name: string;
  type: 'income' | 'expense';
  color: string;
}

export const DEFAULT_EXPENSE_CATEGORIES: DefaultCategorySeed[] = [
  { name: 'Food', type: 'expense', color: '#2563EB' },
  { name: 'Education', type: 'expense', color: '#0D9488' },
  { name: 'Transportation', type: 'expense', color: '#D97706' },
  { name: 'Shopping', type: 'expense', color: '#7C3AED' },
  { name: 'Rent', type: 'expense', color: '#DC2626' },
  { name: 'Electricity', type: 'expense', color: '#EA580C' },
  { name: 'Entertainment', type: 'expense', color: '#DB2777' },
  { name: 'Healthcare', type: 'expense', color: '#16A34A' },
  { name: 'Travel', type: 'expense', color: '#0284C7' },
  { name: 'Others', type: 'expense', color: '#64748B' },
];

export const DEFAULT_INCOME_CATEGORIES: DefaultCategorySeed[] = [
  { name: 'Scholarship', type: 'income', color: '#16A34A' },
  { name: 'Allowance', type: 'income', color: '#2563EB' },
  { name: 'Salary', type: 'income', color: '#0D9488' },
  { name: 'Freelance', type: 'income', color: '#7C3AED' },
  { name: 'Internship', type: 'income', color: '#0284C7' },
  { name: 'Investments', type: 'income', color: '#D97706' },
  { name: 'Others', type: 'income', color: '#64748B' },
];

export function initDatabase(): void {
  db.exec('PRAGMA foreign_keys = ON;');
  db.exec('PRAGMA journal_mode = WAL;');

  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      full_name TEXT NOT NULL,
      email TEXT NOT NULL UNIQUE COLLATE NOCASE,
      phone TEXT NOT NULL DEFAULT '',
      password_hash TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'student',
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS sessions (
      token TEXT PRIMARY KEY,
      user_id INTEGER NOT NULL,
      expires_at TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS categories (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      name TEXT NOT NULL,
      type TEXT NOT NULL CHECK(type IN ('income', 'expense')),
      color TEXT NOT NULL DEFAULT '#2563EB',
      is_default INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      UNIQUE(user_id, name, type)
    );

    CREATE TABLE IF NOT EXISTS transactions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      category_id INTEGER NOT NULL,
      type TEXT NOT NULL CHECK(type IN ('income', 'expense')),
      amount REAL NOT NULL CHECK(amount > 0),
      date TEXT NOT NULL,
      source_or_method TEXT NOT NULL DEFAULT '',
      description TEXT NOT NULL DEFAULT '',
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE RESTRICT
    );

    CREATE TABLE IF NOT EXISTS budgets (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      category_id INTEGER NOT NULL,
      month TEXT NOT NULL,
      limit_amount REAL NOT NULL CHECK(limit_amount > 0),
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE CASCADE,
      UNIQUE(user_id, category_id, month)
    );

    CREATE TABLE IF NOT EXISTS savings_goals (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      goal_name TEXT NOT NULL,
      target_amount REAL NOT NULL CHECK(target_amount > 0),
      current_amount REAL NOT NULL DEFAULT 0 CHECK(current_amount >= 0),
      target_date TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending', 'completed')),
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS settings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL UNIQUE,
      currency TEXT NOT NULL DEFAULT 'INR',
      currency_symbol TEXT NOT NULL DEFAULT '₹',
      date_format TEXT NOT NULL DEFAULT 'DD/MM/YYYY',
      theme TEXT NOT NULL DEFAULT 'light' CHECK(theme IN ('light', 'dark')),
      notify_budget_80 INTEGER NOT NULL DEFAULT 1,
      notify_budget_exceeded INTEGER NOT NULL DEFAULT 1,
      notify_goal_complete INTEGER NOT NULL DEFAULT 1,
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_transactions_user_date ON transactions(user_id, date DESC);
    CREATE INDEX IF NOT EXISTS idx_transactions_user_type ON transactions(user_id, type);
    CREATE INDEX IF NOT EXISTS idx_budgets_user_month ON budgets(user_id, month);
    CREATE INDEX IF NOT EXISTS idx_savings_user ON savings_goals(user_id);
  `);

  const userCols = db.prepare('PRAGMA table_info(users)').all() as Array<{ name: string }>;
  if (!userCols.some((c) => c.name === 'phone')) {
    db.exec("ALTER TABLE users ADD COLUMN phone TEXT NOT NULL DEFAULT '';");
  }

  const settingCols = db.prepare('PRAGMA table_info(settings)').all() as Array<{ name: string }>;
  if (!settingCols.some((c) => c.name === 'notify_budget_80')) {
    db.exec('ALTER TABLE settings ADD COLUMN notify_budget_80 INTEGER NOT NULL DEFAULT 1;');
  }
  if (!settingCols.some((c) => c.name === 'notify_budget_exceeded')) {
    db.exec('ALTER TABLE settings ADD COLUMN notify_budget_exceeded INTEGER NOT NULL DEFAULT 1;');
  }
  if (!settingCols.some((c) => c.name === 'notify_goal_complete')) {
    db.exec('ALTER TABLE settings ADD COLUMN notify_goal_complete INTEGER NOT NULL DEFAULT 1;');
  }
}

export function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString('hex');
  const derived = crypto.scryptSync(password, salt, 64).toString('hex');
  return `scrypt$${salt}$${derived}`;
}

export function verifyPassword(password: string, storedHash: string): boolean {
  const parts = storedHash.split('$');
  if (parts.length !== 3 || parts[0] !== 'scrypt') {
    return false;
  }
  const [, salt, originalHex] = parts;
  const derived = crypto.scryptSync(password, salt, 64);
  const original = Buffer.from(originalHex, 'hex');
  if (derived.length !== original.length) {
    return false;
  }
  return crypto.timingSafeEqual(derived, original);
}

export function seedUserDefaults(userId: number): void {
  const insertCat = db.prepare(
    'INSERT OR IGNORE INTO categories (user_id, name, type, color, is_default) VALUES (?, ?, ?, ?, 1)'
  );
  for (const cat of [...DEFAULT_EXPENSE_CATEGORIES, ...DEFAULT_INCOME_CATEGORIES]) {
    insertCat.run(userId, cat.name, cat.type, cat.color);
  }
  db.prepare(
    'INSERT OR IGNORE INTO settings (user_id, currency, currency_symbol, date_format, theme) VALUES (?, ?, ?, ?, ?)'
  ).run(userId, 'INR', '₹', 'DD/MM/YYYY', 'light');
}

export function seedSampleFinanceData(userId: number, anchorMonth?: string): void {
  seedUserDefaults(userId);

  const now = new Date();
  const baseYear = anchorMonth ? Number(anchorMonth.split('-')[0]) : now.getFullYear();
  const baseMonth = anchorMonth ? Number(anchorMonth.split('-')[1]) : now.getMonth() + 1;

  const getMonthStr = (offset: number): string => {
    const d = new Date(baseYear, baseMonth - 1 + offset, 1);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    return `${y}-${m}`;
  };

  const catRows = db
    .prepare('SELECT id, name, type FROM categories WHERE user_id = ?')
    .all(userId) as Array<{ id: number; name: string; type: 'income' | 'expense' }>;

  const catMap = new Map<string, number>();
  for (const c of catRows) {
    catMap.set(`${c.type}:${c.name}`, Number(c.id));
  }

  const insertTx = db.prepare(
    'INSERT INTO transactions (user_id, category_id, type, amount, date, source_or_method, description) VALUES (?, ?, ?, ?, ?, ?, ?)'
  );

  const months = [getMonthStr(-3), getMonthStr(-2), getMonthStr(-1), getMonthStr(0)];

  months.forEach((ym, idx) => {
    const isCurrent = idx === months.length - 1;
    // Income records
    insertTx.run(
      userId,
      catMap.get('income:Scholarship')!,
      'income',
      15000,
      `${ym}-02`,
      'IIT Patna Merit Scholarship',
      'Monthly institute merit-cum-means stipend'
    );
    insertTx.run(
      userId,
      catMap.get('income:Allowance')!,
      'income',
      12000,
      `${ym}-05`,
      'Family Bank Transfer',
      'Monthly hostel & personal allowance'
    );
    if (idx % 2 === 1) {
      insertTx.run(
        userId,
        catMap.get('income:Freelance')!,
        'income',
        isCurrent ? 8500 : 6500,
        `${ym}-14`,
        'Web UI Contract',
        'Frontend prototype freelance milestone'
      );
    }

    // Expense records
    insertTx.run(
      userId,
      catMap.get('expense:Rent')!,
      'expense',
      6500,
      `${ym}-03`,
      'Net Banking',
      'Hostel room & mess maintenance fee'
    );
    insertTx.run(
      userId,
      catMap.get('expense:Food')!,
      'expense',
      isCurrent ? 4850 : 4100 + idx * 150,
      `${ym}-09`,
      'UPI',
      'Campus canteen, groceries & evening snacks'
    );
    insertTx.run(
      userId,
      catMap.get('expense:Education')!,
      'expense',
      isCurrent ? 2950 : 1800,
      `${ym}-11`,
      'Debit Card',
      'B.Tech reference textbooks & lab printouts'
    );
    insertTx.run(
      userId,
      catMap.get('expense:Transportation')!,
      'expense',
      isCurrent ? 1420 : 1150,
      `${ym}-12`,
      'UPI',
      'Bihta-Patna shuttle & local auto fare'
    );
    insertTx.run(
      userId,
      catMap.get('expense:Electricity')!,
      'expense',
      980,
      `${ym}-15`,
      'UPI',
      'Shared room utility & Wi-Fi top-up'
    );
    insertTx.run(
      userId,
      catMap.get('expense:Entertainment')!,
      'expense',
      isCurrent ? 1650 : 1100,
      `${ym}-17`,
      'UPI',
      'Tech fest passes & weekend cinema'
    );
    insertTx.run(
      userId,
      catMap.get('expense:Healthcare')!,
      'expense',
      isCurrent ? 750 : 450,
      `${ym}-18`,
      'Cash',
      'Pharmacy & health checkup'
    );
    insertTx.run(
      userId,
      catMap.get('expense:Shopping')!,
      'expense',
      isCurrent ? 3400 : 2100,
      `${ym}-19`,
      'Debit Card',
      'Winter jacket & desk accessories'
    );
  });

  // Budgets for current month (demonstrating normal, >=80% warning, and >100% exceeded)
  const currentYm = getMonthStr(0);
  const insertBudget = db.prepare(
    'INSERT OR REPLACE INTO budgets (user_id, category_id, month, limit_amount) VALUES (?, ?, ?, ?)'
  );
  insertBudget.run(userId, catMap.get('expense:Rent')!, currentYm, 7000); // 92.8% warning
  insertBudget.run(userId, catMap.get('expense:Food')!, currentYm, 5500); // 88.2% warning
  insertBudget.run(userId, catMap.get('expense:Education')!, currentYm, 3500); // 84.3% warning
  insertBudget.run(userId, catMap.get('expense:Shopping')!, currentYm, 3000); // 113.3% exceeded!
  insertBudget.run(userId, catMap.get('expense:Transportation')!, currentYm, 2200); // 64.5% nominal
  insertBudget.run(userId, catMap.get('expense:Entertainment')!, currentYm, 2500); // 66% nominal
  insertBudget.run(userId, catMap.get('expense:Electricity')!, currentYm, 1500); // 65.3% nominal

  // Savings Goals
  const insertGoal = db.prepare(
    'INSERT INTO savings_goals (user_id, goal_name, target_amount, current_amount, target_date, status) VALUES (?, ?, ?, ?, ?, ?)'
  );
  insertGoal.run(userId, 'New Coding Laptop Fund', 65000, 42500, `${baseYear + 1}-05-15`, 'pending');
  insertGoal.run(userId, 'Emergency Semester Reserve', 25000, 18000, `${baseYear + 1}-01-31`, 'pending');
  insertGoal.run(userId, 'GATE & Technical Books Kit', 6000, 6000, `${currentYm}-28`, 'completed');
}
