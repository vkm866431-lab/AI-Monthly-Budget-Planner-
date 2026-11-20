export type TransactionType = 'income' | 'expense';

export interface User {
  id: number;
  full_name: string;
  email: string;
  phone?: string;
  role: string;
  created_at: string;
}

export interface UserSettings {
  currency: string;
  currency_symbol: string;
  date_format: 'DD/MM/YYYY' | 'MM/DD/YYYY' | 'YYYY-MM-DD' | string;
  theme: 'light' | 'dark';
  notify_budget_80?: number;
  notify_budget_exceeded?: number;
  notify_goal_complete?: number;
}

export interface Category {
  id: number;
  name: string;
  type: TransactionType;
  color: string;
  is_default: number;
}

export interface Transaction {
  id: number;
  user_id: number;
  category_id: number;
  category_name: string;
  category_color: string;
  type: TransactionType;
  amount: number;
  date: string;
  source_or_method: string;
  description: string;
  created_at: string;
  updated_at: string;
}

export interface BudgetItem {
  id: number;
  category_id: number;
  category_name: string;
  category_color: string;
  month: string;
  limit_amount: number;
  spent_amount: number;
  remaining_amount: number;
  utilization_percent: number;
  status: 'normal' | 'warning' | 'exceeded';
}

export interface BudgetSummary {
  total_budgeted: number;
  total_spent: number;
  total_remaining: number;
  overall_utilization: number;
  warning_count: number;
  exceeded_count: number;
}

export interface SavingsGoalItem {
  id: number;
  goal_name: string;
  target_amount: number;
  current_amount: number;
  target_date: string;
  status: 'pending' | 'completed';
  progress_percent: number;
  created_at: string;
  updated_at: string;
}

export interface SavingsSummary {
  total_saved: number;
  total_target: number;
  completed_count: number;
  pending_count: number;
}

export interface DashboardData {
  month: string;
  kpis: {
    monthly_income: number;
    monthly_expense: number;
    prev_month_income: number;
    prev_month_expense: number;
    income_change_percent: number | null;
    expense_change_percent: number | null;
    monthly_balance: number;
    available_balance: number;
    total_savings: number;
    savings_target: number;
    savings_rate: number;
    total_goals: number;
    completed_goals: number;
    total_budgeted: number;
    total_budget_spent: number;
    budget_utilization: number;
  };
  monthly_trend: Array<{
    month: string;
    income: number;
    expense: number;
    net: number;
  }>;
  category_breakdown: Array<{
    category_id: number;
    category_name: string;
    category_color: string;
    total: number;
    tx_count: number;
  }>;
  budgets: BudgetItem[];
  recent_transactions: Transaction[];
}

export interface AnalyticsData {
  year: string;
  month: string;
  monthly_series: Array<{
    month: string;
    income: number;
    expense: number;
    savings: number;
  }>;
  category_expenses: Array<{
    category_name: string;
    category_color: string;
    total: number;
    count: number;
  }>;
  budget_vs_actual: Array<{
    category_name: string;
    budgeted: number;
    actual: number;
  }>;
  savings_progress: Array<{
    goal_name: string;
    target_amount: number;
    current_amount: number;
    status: string;
    target_date: string;
  }>;
}

export interface ReportData {
  period: 'monthly' | 'yearly';
  value: string;
  summary: {
    total_income: number;
    total_expense: number;
    net_balance: number;
    savings_rate: number;
    transaction_count: number;
  };
  category_breakdown: Array<{
    category_name: string;
    type: TransactionType;
    category_color: string;
    total: number;
    tx_count: number;
  }>;
  transactions: Array<{
    id: number;
    type: TransactionType;
    amount: number;
    date: string;
    source_or_method: string;
    description: string;
    category_name: string;
  }>;
}
