# Monthly Budget Planner — Personal Finance Management System

A full-stack personal finance management application designed for students and individuals to track monthly income, expenses, category-wise budgets, savings goals, interactive analytics, and downloadable CSV/PDF financial reports.

## Architecture Overview

- **Frontend**: React 19, Vite, Tailwind CSS v4, React Router, Chart.js (`react-chartjs-2`), Lucide React Icons.
- **Database**: Relational SQLite (`budget_planner.db`) with `PRAGMA foreign_keys = ON`, strict `CHECK` constraints, and per-user data isolation (`users`, `sessions`, `categories`, `transactions`, `budgets`, `savings_goals`, `settings`).
- **Backend**:
  - **Unified Runtime (`server.ts`)**: Express + Node `node:sqlite` + `pdfkit` serving both the REST API (`/api/*`) and the Vite SPA on port `3000`.
  - **Python Flask Backend (`backend/`)**: Complete standalone Python Flask + SQLite + Werkzeug + ReportLab implementation sharing the exact same database schema and API contract.

## Project Structure

```
Monthly_Budget_Planner/
├── src/
│   ├── components/       # Sidebar, Navbar, DashboardCard, TransactionForm, TransactionTable, ExpenseChart, BudgetCard, SavingsGoal, ConfirmDialog, ToastContainer
│   ├── pages/            # Dashboard, Income, Expenses, Budgets, Savings, Transactions, Analytics, Reports, Settings, Login, Register
│   ├── context/          # ExpenseContext (Auth, Theme, Categories, Month, Notifications)
│   ├── services/         # Typed REST API client & file export downloader
│   ├── types/            # TypeScript interfaces
│   └── utils/            # INR currency, date, and month formatters
├── server/
│   ├── db.ts             # SQLite schema initialization, scrypt password hashing, default categories
│   ├── middleware/       # Session verification & user isolation middleware
│   └── routes/           # auth, transactions, budgets, savings, analytics/reports, settings
├── server.ts             # Unified Express + Vite server (port 3000)
├── backend/              # Standalone Python Flask + ReportLab + Werkzeug backend
│   ├── app.py
│   ├── database.py
│   ├── routes/
│   ├── services/
│   ├── seed.py
│   └── requirements.txt
├── .env.example
└── package.json
```

## Quick Start (Unified Full-Stack Server)

1. Install Node.js dependencies:
   ```bash
   npm install
   ```
2. Start the development server (port 3000):
   ```bash
   npm run dev
   ```
3. Build for production & run:
   ```bash
   npm run build
   npm start
   ```

## Running the Standalone Python Flask Backend

1. Create and activate a virtual environment inside `backend/`:
   ```bash
   cd backend
   python3 -m venv .venv
   source .venv/bin/activate
   pip install -r requirements.txt
   ```
2. Optionally seed demo data and start Flask:
   ```bash
   python seed.py
   python app.py
   ```
3. Configure Vite proxy or `VITE_API_URL` if running Flask separately on port 5000.

## Testing

- **TypeScript & Lint Check**: `npm run lint`
- **Production Build**: `npm run build`
- **Python Syntax Verification**: `python3 -m py_compile backend/app.py backend/database.py backend/seed.py backend/routes/*.py backend/services/*.py`
- **End-to-End API & User Isolation**: Verified via automated registration, login, CRUD, budget threshold warnings, CSV/PDF export, and cross-user authorization checks against `budget_planner.db`.
