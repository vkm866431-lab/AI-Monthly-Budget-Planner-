import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { api, setStoredToken } from '../services/api';
import type { Category, User, UserSettings } from '../types/finance';
import { getCurrentMonth } from '../utils/format';

export interface ToastMessage {
  id: string;
  type: 'success' | 'error' | 'info';
  message: string;
}

interface ExpenseContextValue {
  user: User | null;
  settings: UserSettings;
  categories: Category[];
  authLoading: boolean;
  selectedMonth: string;
  setSelectedMonth: (month: string) => void;
  refreshTick: number;
  triggerRefresh: () => void;
  toasts: ToastMessage[];
  notify: (type: ToastMessage['type'], message: string) => void;
  dismissToast: (id: string) => void;
  loginSession: (
    token: string,
    user: User,
    settings?: UserSettings,
    rememberMe?: boolean
  ) => Promise<void>;
  logoutSession: () => Promise<void>;
  updateLocalUser: (user: User) => void;
  updatePreferences: (prefs: Partial<UserSettings>) => Promise<void>;
  reloadCategories: () => Promise<void>;
}

const DEFAULT_SETTINGS: UserSettings = {
  currency: 'INR',
  currency_symbol: '₹',
  date_format: 'DD/MM/YYYY',
  theme: 'light',
};

const ExpenseContext = createContext<ExpenseContextValue | undefined>(undefined);

export function ExpenseProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [settings, setSettings] = useState<UserSettings>(DEFAULT_SETTINGS);
  const [categories, setCategories] = useState<Category[]>([]);
  const [authLoading, setAuthLoading] = useState(true);
  const [selectedMonth, setSelectedMonth] = useState(getCurrentMonth());
  const [refreshTick, setRefreshTick] = useState(0);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const applyThemeClass = useCallback((theme: 'light' | 'dark') => {
    const root = document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
  }, []);

  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const notify = useCallback((type: ToastMessage['type'], message: string) => {
    const id = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    setToasts((prev) => [...prev, { id, type, message }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  }, []);

  const triggerRefresh = useCallback(() => {
    setRefreshTick((t) => t + 1);
  }, []);

  const reloadCategories = useCallback(async () => {
    try {
      const data = await api.settings.getAll();
      setCategories(data.categories);
      if (data.settings) {
        setSettings(data.settings);
        applyThemeClass(data.settings.theme === 'dark' ? 'dark' : 'light');
      }
    } catch {
      // ignore if unauthenticated
    }
  }, [applyThemeClass]);

  useEffect(() => {
    let active = true;
    async function bootstrap() {
      try {
        const res = await api.auth.me();
        if (!active) return;
        setUser(res.user);
        const s = res.settings || DEFAULT_SETTINGS;
        setSettings(s);
        applyThemeClass(s.theme === 'dark' ? 'dark' : 'light');
        const settingsRes = await api.settings.getAll();
        if (!active) return;
        setCategories(settingsRes.categories);
      } catch {
        if (!active) return;
        setUser(null);
        setStoredToken(null);
        applyThemeClass('light');
      } finally {
        if (active) setAuthLoading(false);
      }
    }
    bootstrap();
    return () => {
      active = false;
    };
  }, [applyThemeClass]);

  const loginSession = useCallback(
    async (
      token: string,
      nextUser: User,
      nextSettings?: UserSettings,
      rememberMe = true
    ) => {
      setStoredToken(token, rememberMe);
      setUser(nextUser);
      const s = nextSettings || DEFAULT_SETTINGS;
      setSettings(s);
      applyThemeClass(s.theme === 'dark' ? 'dark' : 'light');
      try {
        const full = await api.settings.getAll();
        setCategories(full.categories);
      } catch {
        // ignore
      }
      triggerRefresh();
    },
    [applyThemeClass, triggerRefresh]
  );

  const logoutSession = useCallback(async () => {
    try {
      await api.auth.logout();
    } catch {
      // ignore
    }
    setStoredToken(null);
    setUser(null);
    setCategories([]);
    setSettings(DEFAULT_SETTINGS);
    applyThemeClass('light');
  }, [applyThemeClass]);

  const updateLocalUser = useCallback((nextUser: User) => {
    setUser(nextUser);
  }, []);

  const updatePreferences = useCallback(
    async (prefs: Partial<UserSettings>) => {
      const merged = { ...settings, ...prefs };
      setSettings(merged);
      applyThemeClass(merged.theme === 'dark' ? 'dark' : 'light');
      if (user) {
        const res = await api.settings.updatePreferences(merged);
        setSettings(res.settings);
        applyThemeClass(res.settings.theme === 'dark' ? 'dark' : 'light');
      }
    },
    [settings, user, applyThemeClass]
  );

  return (
    <ExpenseContext.Provider
      value={{
        user,
        settings,
        categories,
        authLoading,
        selectedMonth,
        setSelectedMonth,
        refreshTick,
        triggerRefresh,
        toasts,
        notify,
        dismissToast,
        loginSession,
        logoutSession,
        updateLocalUser,
        updatePreferences,
        reloadCategories,
      }}
    >
      {children}
    </ExpenseContext.Provider>
  );
}

export function useExpense(): ExpenseContextValue {
  const ctx = useContext(ExpenseContext);
  if (!ctx) throw new Error('useExpense must be used inside ExpenseProvider');
  return ctx;
}
