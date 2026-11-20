import React, { useEffect, useRef, useState } from 'react';
import {
  AlertCircle,
  AlertTriangle,
  Bell,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  LogOut,
  Menu,
  Moon,
  Plus,
  Search,
  Settings,
  Sun,
} from 'lucide-react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useExpense } from '../context/ExpenseContext';
import { api } from '../services/api';
import { formatMoney, getRecentMonthOptions } from '../utils/format';

interface NavbarProps {
  onOpenMobileMenu: () => void;
  onOpenQuickAdd: () => void;
  onRequestLogout: () => void;
}

interface AlertItem {
  id: string;
  title: string;
  detail: string;
  kind: 'exceeded' | 'warning' | 'goal';
  to: string;
}

const ROUTE_TITLES: Record<string, string> = {
  '/dashboard': 'Dashboard',
  '/income': 'Income',
  '/expenses': 'Expenses',
  '/budgets': 'Monthly Budgets',
  '/savings': 'Savings Goals',
  '/transactions': 'Transactions',
  '/analytics': 'Analytics',
  '/reports': 'Reports',
  '/settings': 'Settings',
};

export default function Navbar({
  onOpenMobileMenu,
  onOpenQuickAdd,
  onRequestLogout,
}: NavbarProps) {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const { user, settings, updatePreferences, selectedMonth, setSelectedMonth, refreshTick } =
    useExpense();
  const monthOptions = getRecentMonthOptions(12);

  const [globalQuery, setGlobalQuery] = useState('');
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [bellOpen, setBellOpen] = useState(false);
  const [alerts, setAlerts] = useState<AlertItem[]>([]);
  const [dismissedIds, setDismissedIds] = useState<string[]>([]);

  const dropdownRef = useRef<HTMLDivElement>(null);
  const bellRef = useRef<HTMLDivElement>(null);

  const pageTitle = ROUTE_TITLES[pathname] || 'Monthly Budget Planner';
  const isDark = settings.theme === 'dark';

  const firstInitial = (user?.full_name?.trim().charAt(0) || 'U').toUpperCase();

  useEffect(() => {
    function handleOutsideClick(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
      if (bellRef.current && !bellRef.current.contains(e.target as Node)) {
        setBellOpen(false);
      }
    }
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, []);

  useEffect(() => {
    let active = true;
    async function loadAlerts() {
      if (!user) return;
      try {
        const [budgetRes, savingsRes] = await Promise.all([
          api.budgets.list(selectedMonth),
          api.savings.list('completed'),
        ]);
        if (!active) return;

        const items: AlertItem[] = [];
        const allow80 = settings.notify_budget_80 !== 0;
        const allowExceeded = settings.notify_budget_exceeded !== 0;
        const allowGoal = settings.notify_goal_complete !== 0;

        for (const b of budgetRes.budgets) {
          if (b.status === 'exceeded' && allowExceeded) {
            items.push({
              id: `budget-exceeded-${b.id}-${selectedMonth}`,
              title: `${b.category_name} budget exceeded`,
              detail: `${b.utilization_percent.toFixed(0)}% used (${formatMoney(
                b.spent_amount,
                settings.currency_symbol,
                settings.currency
              )} of ${formatMoney(
                b.limit_amount,
                settings.currency_symbol,
                settings.currency
              )})`,
              kind: 'exceeded',
              to: '/budgets',
            });
          } else if (b.status === 'warning' && allow80) {
            items.push({
              id: `budget-warn-${b.id}-${selectedMonth}`,
              title: `${b.category_name} approaching limit`,
              detail: `${b.utilization_percent.toFixed(0)}% of monthly budget utilized`,
              kind: 'warning',
              to: '/budgets',
            });
          }
        }

        if (allowGoal) {
          for (const g of savingsRes.goals) {
            items.push({
              id: `goal-done-${g.id}`,
              title: `Goal achieved: ${g.goal_name}`,
              detail: `Saved ${formatMoney(
                g.current_amount,
                settings.currency_symbol,
                settings.currency
              )} target`,
              kind: 'goal',
              to: '/savings',
            });
          }
        }

        setAlerts(items);
      } catch {
        // ignore transient errors
      }
    }
    void loadAlerts();
    return () => {
      active = false;
    };
  }, [
    user,
    selectedMonth,
    refreshTick,
    settings.notify_budget_80,
    settings.notify_budget_exceeded,
    settings.notify_goal_complete,
    settings.currency_symbol,
    settings.currency,
  ]);

  const unreadAlerts = alerts.filter((a) => !dismissedIds.includes(a.id));

  function handleGlobalSearchSubmit(e: React.FormEvent) {
    e.preventDefault();
    const q = globalQuery.trim();
    if (!q) {
      navigate('/transactions');
      return;
    }
    navigate(`/transactions?search=${encodeURIComponent(q)}`);
  }

  return (
    <header className="h-16 bg-white/95 dark:bg-[#111827]/95 backdrop-blur-xs border-b border-[#E5E7EB] dark:border-[#263247] px-4 sm:px-6 flex items-center justify-between gap-3 shrink-0 sticky top-0 z-30">
      {/* Left: Mobile Menu & Breadcrumb */}
      <div className="flex items-center gap-3 min-w-0">
        <button
          type="button"
          onClick={onOpenMobileMenu}
          className="lg:hidden p-2 rounded-xl text-[#6B7280] dark:text-[#9CA3AF] hover:bg-[#F7F9FC] dark:hover:bg-[#172033] shrink-0 min-h-[40px] min-w-[40px] flex items-center justify-center"
          aria-label="Open navigation menu"
        >
          <Menu className="w-5 h-5" />
        </button>

        <nav aria-label="Breadcrumb" className="min-w-0 flex items-center gap-1.5 text-sm">
          <Link
            to="/dashboard"
            className="hidden sm:inline text-xs font-medium text-[#6B7280] dark:text-[#9CA3AF] hover:text-[#111827] dark:hover:text-[#F9FAFB] transition-colors"
          >
            BudgetLedger
          </Link>
          <ChevronRight className="hidden sm:inline w-3.5 h-3.5 text-[#6B7280]/60 dark:text-[#9CA3AF]/60 shrink-0" />
          <h1 className="text-sm sm:text-base font-semibold text-[#111827] dark:text-[#F9FAFB] truncate">
            {pageTitle}
          </h1>
        </nav>
      </div>

      {/* Right Controls */}
      <div className="flex items-center gap-2 sm:gap-2.5 shrink-0">
        {/* Global Transaction Search */}
        <form onSubmit={handleGlobalSearchSubmit} className="relative hidden xl:block w-60">
          <Search className="w-3.5 h-3.5 text-[#6B7280] dark:text-[#9CA3AF] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="search"
            value={globalQuery}
            onChange={(e) => setGlobalQuery(e.target.value)}
            placeholder="Search transactions..."
            aria-label="Search transactions"
            className="w-full h-9 pl-8 pr-3 rounded-xl border border-[#E5E7EB] dark:border-[#263247] bg-[#F7F9FC] dark:bg-[#0B1120] text-xs text-[#111827] dark:text-[#F9FAFB] placeholder:text-[#6B7280] dark:placeholder:text-[#9CA3AF] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#4F46E5] dark:focus-visible:ring-[#818CF8]"
          />
        </form>

        {/* Month Selector */}
        <label htmlFor="global-month-select" className="sr-only">
          Active month
        </label>
        <select
          id="global-month-select"
          value={selectedMonth}
          onChange={(e) => setSelectedMonth(e.target.value)}
          className="hidden md:block h-9 rounded-xl border border-[#E5E7EB] dark:border-[#263247] bg-[#F7F9FC] dark:bg-[#0B1120] px-3 text-xs font-medium text-[#111827] dark:text-[#F9FAFB] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#4F46E5] dark:focus-visible:ring-[#818CF8]"
        >
          {monthOptions.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>

        {/* Notifications Popover */}
        <div className="relative" ref={bellRef}>
          <button
            type="button"
            onClick={() => setBellOpen((o) => !o)}
            className="relative h-9 w-9 rounded-xl border border-[#E5E7EB] dark:border-[#263247] bg-white dark:bg-[#172033] text-[#6B7280] dark:text-[#9CA3AF] hover:bg-[#F7F9FC] dark:hover:bg-[#1E293B] hover:text-[#111827] dark:hover:text-[#F9FAFB] flex items-center justify-center transition-colors shrink-0"
            aria-label="Notifications"
            aria-expanded={bellOpen}
          >
            <Bell className="w-4 h-4" />
            {unreadAlerts.length > 0 && (
              <span className="absolute -top-1 -right-1 min-w-[16px] h-4 px-1 rounded-full bg-[#EF4444] text-white text-[10px] font-semibold flex items-center justify-center font-mono-num">
                {unreadAlerts.length}
              </span>
            )}
          </button>

          {bellOpen && (
            <div className="absolute right-0 mt-2 w-80 rounded-2xl border border-[#E5E7EB] dark:border-[#263247] bg-white dark:bg-[#172033] shadow-xl z-40 overflow-hidden">
              <div className="px-4 py-3 border-b border-[#E5E7EB] dark:border-[#263247] flex items-center justify-between">
                <span className="text-xs font-semibold text-[#111827] dark:text-[#F9FAFB]">
                  Budget & Goal Alerts
                </span>
                {unreadAlerts.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setDismissedIds(alerts.map((a) => a.id))}
                    className="text-[11px] font-medium text-[#4F46E5] dark:text-[#818CF8] hover:underline"
                  >
                    Mark all read
                  </button>
                )}
              </div>

              <div className="max-h-72 overflow-y-auto divide-y divide-[#E5E7EB]/60 dark:divide-[#263247]">
                {alerts.length === 0 ? (
                  <div className="px-4 py-6 text-center">
                    <CheckCircle2 className="w-5 h-5 text-[#16A34A] mx-auto" />
                    <p className="mt-2 text-xs font-medium text-[#111827] dark:text-[#F9FAFB]">
                      All caught up
                    </p>
                    <p className="mt-0.5 text-[11px] text-[#6B7280] dark:text-[#9CA3AF]">
                      No active budget warnings or alerts for this month.
                    </p>
                  </div>
                ) : (
                  alerts.map((alert) => {
                    const isRead = dismissedIds.includes(alert.id);
                    const Icon =
                      alert.kind === 'exceeded'
                        ? AlertCircle
                        : alert.kind === 'warning'
                        ? AlertTriangle
                        : CheckCircle2;
                    const iconColor =
                      alert.kind === 'exceeded'
                        ? 'text-[#EF4444]'
                        : alert.kind === 'warning'
                        ? 'text-[#F59E0B]'
                        : 'text-[#16A34A]';

                    return (
                      <Link
                        key={alert.id}
                        to={alert.to}
                        onClick={() => {
                          setDismissedIds((prev) =>
                            prev.includes(alert.id) ? prev : [...prev, alert.id]
                          );
                          setBellOpen(false);
                        }}
                        className={`flex items-start gap-2.5 px-4 py-3 hover:bg-[#F7F9FC] dark:hover:bg-[#1E293B]/60 transition-colors ${
                          isRead ? 'opacity-60' : ''
                        }`}
                      >
                        <Icon className={`w-4 h-4 shrink-0 mt-0.5 ${iconColor}`} />
                        <div className="min-w-0 flex-1">
                          <p className="text-xs font-medium text-[#111827] dark:text-[#F9FAFB] truncate">
                            {alert.title}
                          </p>
                          <p className="text-[11px] text-[#6B7280] dark:text-[#9CA3AF] mt-0.5">
                            {alert.detail}
                          </p>
                        </div>
                      </Link>
                    );
                  })
                )}
              </div>
            </div>
          )}
        </div>

        {/* Light / Dark Toggle */}
        <button
          type="button"
          onClick={() => void updatePreferences({ theme: isDark ? 'light' : 'dark' })}
          className="h-9 w-9 rounded-xl border border-[#E5E7EB] dark:border-[#263247] bg-white dark:bg-[#172033] text-[#6B7280] dark:text-[#9CA3AF] hover:bg-[#F7F9FC] dark:hover:bg-[#1E293B] hover:text-[#111827] dark:hover:text-[#F9FAFB] flex items-center justify-center transition-colors shrink-0"
          aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
          title={isDark ? 'Light mode' : 'Dark mode'}
        >
          {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
        </button>

        {/* Quick Add Transaction */}
        <button
          type="button"
          onClick={onOpenQuickAdd}
          className="h-9 px-3.5 rounded-xl bg-[#4F46E5] hover:bg-[#4338CA] text-white text-xs sm:text-sm font-medium flex items-center gap-1.5 transition-colors whitespace-nowrap shrink-0 shadow-xs"
        >
          <Plus className="w-4 h-4 shrink-0" />
          <span className="hidden sm:inline">Add Transaction</span>
          <span className="sm:hidden">Add</span>
        </button>

        {/* User Profile Dropdown */}
        <div className="relative" ref={dropdownRef}>
          <button
            type="button"
            onClick={() => setDropdownOpen((o) => !o)}
            className="h-9 pl-1.5 pr-2.5 rounded-xl border border-[#E5E7EB] dark:border-[#263247] bg-white dark:bg-[#172033] hover:bg-[#F7F9FC] dark:hover:bg-[#1E293B] flex items-center gap-2 transition-colors shrink-0"
            aria-expanded={dropdownOpen}
            aria-haspopup="menu"
          >
            <span
              className="w-6 h-6 rounded-lg bg-[#4F46E5] text-white text-xs font-semibold flex items-center justify-center shrink-0"
              aria-hidden="true"
            >
              {firstInitial}
            </span>
            <span className="hidden sm:inline text-xs font-medium text-[#111827] dark:text-[#F9FAFB] max-w-[100px] truncate">
              {user?.full_name}
            </span>
            <ChevronDown className="w-3.5 h-3.5 text-[#6B7280] dark:text-[#9CA3AF] shrink-0" />
          </button>

          {dropdownOpen && (
            <div
              role="menu"
              className="absolute right-0 mt-2 w-60 rounded-2xl border border-[#E5E7EB] dark:border-[#263247] bg-white dark:bg-[#172033] shadow-xl py-1.5 z-40"
            >
              <div className="px-4 py-2.5 border-b border-[#E5E7EB] dark:border-[#263247] flex items-center gap-2.5">
                <span
                  className="w-8 h-8 rounded-xl bg-[#4F46E5] text-white text-xs font-semibold flex items-center justify-center shrink-0"
                  aria-hidden="true"
                >
                  {firstInitial}
                </span>
                <div className="min-w-0">
                  <p className="text-xs font-semibold text-[#111827] dark:text-[#F9FAFB] truncate">
                    {user?.full_name}
                  </p>
                  <p className="text-xs text-[#6B7280] dark:text-[#9CA3AF] truncate mt-0.5">
                    {user?.email}
                  </p>
                </div>
              </div>
              <Link
                to="/settings"
                role="menuitem"
                onClick={() => setDropdownOpen(false)}
                className="flex items-center gap-2.5 px-4 py-2 text-xs font-medium text-[#111827] dark:text-[#F9FAFB] hover:bg-[#F7F9FC] dark:hover:bg-[#1E293B] transition-colors"
              >
                <Settings className="w-3.5 h-3.5 text-[#6B7280] dark:text-[#9CA3AF]" />
                <span>Profile & Settings</span>
              </Link>
              <button
                type="button"
                role="menuitem"
                onClick={() => {
                  setDropdownOpen(false);
                  onRequestLogout();
                }}
                className="w-full flex items-center gap-2.5 px-4 py-2 text-xs font-medium text-[#EF4444] dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 transition-colors text-left"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Logout</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
