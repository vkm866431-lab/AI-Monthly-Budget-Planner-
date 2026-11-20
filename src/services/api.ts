import type {
  AnalyticsData,
  BudgetItem,
  BudgetSummary,
  Category,
  DashboardData,
  ReportData,
  SavingsGoalItem,
  SavingsSummary,
  Transaction,
  TransactionType,
  User,
  UserSettings,
} from '../types/finance';

const TOKEN_STORAGE_KEY = 'mbp_auth_token';

export function getStoredToken(): string | null {
  try {
    return sessionStorage.getItem(TOKEN_STORAGE_KEY) || localStorage.getItem(TOKEN_STORAGE_KEY);
  } catch {
    return null;
  }
}

export function setStoredToken(token: string | null, rememberMe = true): void {
  try {
    sessionStorage.removeItem(TOKEN_STORAGE_KEY);
    localStorage.removeItem(TOKEN_STORAGE_KEY);
    if (token) {
      if (rememberMe) {
        localStorage.setItem(TOKEN_STORAGE_KEY, token);
      } else {
        sessionStorage.setItem(TOKEN_STORAGE_KEY, token);
      }
    }
  } catch {
    // ignore storage restriction
  }
}

export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = getStoredToken();
  const headers = new Headers(options.headers || {});
  if (!headers.has('Content-Type') && options.body && typeof options.body === 'string') {
    headers.set('Content-Type', 'application/json');
  }
  if (token && !headers.has('Authorization')) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  const res = await fetch(path, {
    ...options,
    headers,
    credentials: 'include',
  });

  if (!res.ok) {
    let message = `Request failed (${res.status})`;
    try {
      const data = (await res.json()) as { error?: string };
      if (data.error) message = data.error;
    } catch {
      // non-json error
    }
    throw new ApiError(message, res.status);
  }

  return (await res.json()) as T;
}

export async function downloadReportFile(
  format: 'csv' | 'pdf',
  period: 'monthly' | 'yearly',
  value: string
): Promise<void> {
  const token = getStoredToken();
  const headers = new Headers();
  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  const res = await fetch(
    `/api/analytics/report/${format}?period=${encodeURIComponent(period)}&value=${encodeURIComponent(
      value
    )}`,
    {
      headers,
      credentials: 'include',
    }
  );

  if (!res.ok) {
    throw new ApiError('Failed to download report file.', res.status);
  }

  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `budget-report-${period}-${value}.${format}`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export const api = {
  auth: {
    register: (payload: {
      full_name: string;
      email: string;
      phone?: string;
      password: string;
      role?: string;
    }) =>
      request<{ message: string; user: User }>('/api/auth/register', {
        method: 'POST',
        body: JSON.stringify(payload),
      }),
    login: (payload: { email: string; password: string; remember_me?: boolean }) =>
      request<{ token: string; user: User; settings: UserSettings }>('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify(payload),
      }),
    demo: () =>
      request<{ token: string; user: User; settings: UserSettings }>('/api/auth/demo', {
        method: 'POST',
      }),
    logout: () => request<{ message: string }>('/api/auth/logout', { method: 'POST' }),
    me: () => request<{ user: User; settings: UserSettings }>('/api/auth/me'),
  },

  transactions: {
    list: (params: Record<string, string | number | undefined>) => {
      const qs = new URLSearchParams();
      for (const [k, v] of Object.entries(params)) {
        if (v !== undefined && v !== '' && v !== 0) {
          qs.set(k, String(v));
        }
      }
      return request<{
        transactions: Transaction[];
        pagination: { page: number; limit: number; total: number; total_pages: number };
        summary: { total_income: number; total_expense: number };
      }>(`/api/transactions?${qs.toString()}`);
    },
    create: (payload: {
      type: TransactionType;
      category_id: number;
      amount: number;
      date: string;
      source_or_method: string;
      description: string;
    }) =>
      request<{ transaction: Transaction }>('/api/transactions', {
        method: 'POST',
        body: JSON.stringify(payload),
      }),
    update: (
      id: number,
      payload: {
        type: TransactionType;
        category_id: number;
        amount: number;
        date: string;
        source_or_method: string;
        description: string;
      }
    ) =>
      request<{ transaction: Transaction }>(`/api/transactions/${id}`, {
        method: 'PUT',
        body: JSON.stringify(payload),
      }),
    remove: (id: number) =>
      request<{ message: string }>(`/api/transactions/${id}`, { method: 'DELETE' }),
  },

  budgets: {
    list: (month: string) =>
      request<{ month: string; budgets: BudgetItem[]; summary: BudgetSummary }>(
        `/api/budgets?month=${encodeURIComponent(month)}`
      ),
    save: (payload: { category_id: number; month: string; limit_amount: number }) =>
      request<{ message: string }>('/api/budgets', {
        method: 'POST',
        body: JSON.stringify(payload),
      }),
    update: (id: number, limit_amount: number) =>
      request<{ message: string }>(`/api/budgets/${id}`, {
        method: 'PUT',
        body: JSON.stringify({ limit_amount }),
      }),
    remove: (id: number) =>
      request<{ message: string }>(`/api/budgets/${id}`, { method: 'DELETE' }),
  },

  savings: {
    list: (status?: string) =>
      request<{ goals: SavingsGoalItem[]; summary: SavingsSummary }>(
        `/api/savings${status ? `?status=${encodeURIComponent(status)}` : ''}`
      ),
    create: (payload: {
      goal_name: string;
      target_amount: number;
      current_amount: number;
      target_date: string;
    }) =>
      request<{ goal: SavingsGoalItem }>('/api/savings', {
        method: 'POST',
        body: JSON.stringify(payload),
      }),
    update: (
      id: number,
      payload: {
        goal_name?: string;
        target_amount?: number;
        current_amount?: number;
        add_amount?: number;
        target_date?: string;
      }
    ) =>
      request<{ goal: SavingsGoalItem }>(`/api/savings/${id}`, {
        method: 'PUT',
        body: JSON.stringify(payload),
      }),
    remove: (id: number) =>
      request<{ message: string }>(`/api/savings/${id}`, { method: 'DELETE' }),
  },

  analytics: {
    dashboard: (month: string) =>
      request<DashboardData>(`/api/analytics/dashboard?month=${encodeURIComponent(month)}`),
    charts: (year: string, month: string) =>
      request<AnalyticsData>(
        `/api/analytics/charts?year=${encodeURIComponent(year)}&month=${encodeURIComponent(month)}`
      ),
    report: (period: 'monthly' | 'yearly', value: string) =>
      request<ReportData>(
        `/api/analytics/report?period=${encodeURIComponent(period)}&value=${encodeURIComponent(value)}`
      ),
  },

  settings: {
    getAll: () =>
      request<{ user: User; settings: UserSettings; categories: Category[] }>('/api/settings'),
    createCategory: (payload: { name: string; type: TransactionType; color: string }) =>
      request<{ category: Category }>('/api/settings/categories', {
        method: 'POST',
        body: JSON.stringify(payload),
      }),
    updateProfile: (payload: {
      full_name: string;
      email: string;
      phone?: string;
      role?: string;
    }) =>
      request<{ user: User }>('/api/settings/profile', {
        method: 'PUT',
        body: JSON.stringify(payload),
      }),
    updatePassword: (payload: { current_password: string; new_password: string }) =>
      request<{ message: string }>('/api/settings/password', {
        method: 'PUT',
        body: JSON.stringify(payload),
      }),
    updatePreferences: (payload: Partial<UserSettings>) =>
      request<{ settings: UserSettings }>('/api/settings/preferences', {
        method: 'PUT',
        body: JSON.stringify(payload),
      }),
    seedSample: (month?: string) =>
      request<{ message: string }>('/api/settings/seed-sample', {
        method: 'POST',
        body: JSON.stringify({ month }),
      }),
    clearData: () =>
      request<{ message: string }>('/api/settings/clear-data', { method: 'DELETE' }),
  },
};
