import os
import sqlite3
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent
DEFAULT_DB_PATH = BASE_DIR / "budget_planner.db"
DATABASE_PATH = os.getenv("DATABASE_PATH", str(DEFAULT_DB_PATH))

DEFAULT_EXPENSE_CATEGORIES = [
    ("Food", "expense", "#2563EB"),
    ("Education", "expense", "#0D9488"),
    ("Transportation", "expense", "#D97706"),
    ("Shopping", "expense", "#7C3AED"),
    ("Rent", "expense", "#DC2626"),
    ("Electricity", "expense", "#EA580C"),
    ("Entertainment", "expense", "#DB2777"),
    ("Healthcare", "expense", "#16A34A"),
    ("Travel", "expense", "#0284C7"),
    ("Others", "expense", "#64748B"),
]

DEFAULT_INCOME_CATEGORIES = [
    ("Scholarship", "income", "#16A34A"),
    ("Allowance", "income", "#2563EB"),
    ("Salary", "income", "#0D9488"),
    ("Freelance", "income", "#7C3AED"),
    ("Internship", "income", "#0284C7"),
    ("Investments", "income", "#D97706"),
    ("Others", "income", "#64748B"),
]


def get_connection() -> sqlite3.Connection:
    conn = sqlite3.connect(DATABASE_PATH, check_same_thread=False)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys = ON;")
    return conn


def init_db() -> None:
    conn = get_connection()
    try:
        conn.executescript(
            """
            PRAGMA foreign_keys = ON;

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
                updated_at TEXT NOT NULL DEFAULT (datetime('now')),
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
            );
            """
        )
        conn.commit()
    finally:
        conn.close()


def seed_user_defaults(conn: sqlite3.Connection, user_id: int) -> None:
    for name, ctype, color in DEFAULT_EXPENSE_CATEGORIES + DEFAULT_INCOME_CATEGORIES:
        conn.execute(
            "INSERT OR IGNORE INTO categories (user_id, name, type, color, is_default) VALUES (?, ?, ?, ?, 1)",
            (user_id, name, ctype, color),
        )
    conn.execute(
        "INSERT OR IGNORE INTO settings (user_id, currency, currency_symbol, date_format, theme) VALUES (?, 'INR', '₹', 'DD/MM/YYYY', 'light')",
        (user_id,),
    )
    conn.commit()
