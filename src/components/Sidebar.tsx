import { NavLink } from 'react-router-dom';
import {
  ArrowDownCircle,
  ArrowUpCircle,
  BarChart3,
  FileSpreadsheet,
  LayoutDashboard,
  ListOrdered,
  LogOut,
  PanelLeftClose,
  PanelLeftOpen,
  PiggyBank,
  Settings,
  Target,
  Wallet,
  X,
} from 'lucide-react';
import { useExpense } from '../context/ExpenseContext';

interface SidebarProps {
  collapsed: boolean;
  onToggleCollapse: () => void;
  mobileOpen: boolean;
  onCloseMobile: () => void;
  onRequestLogout: () => void;
}

const NAV_ITEMS = [
  { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: '/income', label: 'Income', icon: ArrowUpCircle },
  { to: '/expenses', label: 'Expenses', icon: ArrowDownCircle },
  { to: '/transactions', label: 'Transactions', icon: ListOrdered },
  { to: '/budgets', label: 'Monthly Budgets', icon: Wallet },
  { to: '/savings', label: 'Savings Goals', icon: Target },
  { to: '/analytics', label: 'Analytics', icon: BarChart3 },
  { to: '/reports', label: 'Reports', icon: FileSpreadsheet },
  { to: '/settings', label: 'Settings', icon: Settings },
];

export default function Sidebar({
  collapsed,
  onToggleCollapse,
  mobileOpen,
  onCloseMobile,
  onRequestLogout,
}: SidebarProps) {
  const { user } = useExpense();

  const firstInitial = (user?.full_name?.trim().charAt(0) || 'U').toUpperCase();

  function renderSidebarBody(isMobileDrawer: boolean) {
    const isCollapsed = !isMobileDrawer && collapsed;

    return (
      <div
        className={`flex flex-col h-full bg-white dark:bg-[#111827] text-[#111827] dark:text-[#F9FAFB] select-none transition-[width] duration-200 ${
          isCollapsed ? 'w-[76px]' : 'w-64'
        }`}
      >
        {/* Brand & Collapse Toggle */}
        <div
          className={`h-16 flex items-center border-b border-[#E5E7EB] dark:border-[#263247] shrink-0 ${
            isCollapsed ? 'justify-center px-2' : 'justify-between px-4'
          }`}
        >
          <NavLink
            to="/dashboard"
            onClick={onCloseMobile}
            className="flex items-center gap-2.5 whitespace-nowrap shrink-0 min-w-0"
            title="BudgetLedger"
          >
            <div className="w-8 h-8 rounded-xl bg-[#4F46E5] flex items-center justify-center text-white shrink-0 shadow-xs">
              <PiggyBank className="w-4 h-4" />
            </div>
            {!isCollapsed && (
              <div className="min-w-0">
                <span className="font-display text-sm font-bold tracking-tight text-[#111827] dark:text-[#F9FAFB] block leading-tight">
                  BudgetLedger
                </span>
                <span className="text-[11px] text-[#6B7280] dark:text-[#9CA3AF] block leading-tight">
                  Monthly Planner
                </span>
              </div>
            )}
          </NavLink>

          {isMobileDrawer ? (
            <button
              type="button"
              onClick={onCloseMobile}
              className="p-1.5 rounded-lg text-[#6B7280] dark:text-[#9CA3AF] hover:bg-[#F7F9FC] dark:hover:bg-[#172033]"
              aria-label="Close navigation menu"
            >
              <X className="w-5 h-5" />
            </button>
          ) : (
            !isCollapsed && (
              <button
                type="button"
                onClick={onToggleCollapse}
                className="p-1.5 rounded-lg text-[#6B7280] dark:text-[#9CA3AF] hover:text-[#111827] dark:hover:text-[#F9FAFB] hover:bg-[#F7F9FC] dark:hover:bg-[#172033] transition-colors"
                aria-label="Collapse sidebar"
                title="Collapse sidebar"
              >
                <PanelLeftClose className="w-4 h-4" />
              </button>
            )
          )}
        </div>

        {/* Navigation Links */}
        <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1" aria-label="Primary Navigation">
          {isCollapsed && (
            <button
              type="button"
              onClick={onToggleCollapse}
              className="w-full flex items-center justify-center py-2 mb-2 rounded-xl text-[#6B7280] dark:text-[#9CA3AF] hover:text-[#111827] dark:hover:text-[#F9FAFB] hover:bg-[#F7F9FC] dark:hover:bg-[#172033] transition-colors"
              aria-label="Expand sidebar"
              title="Expand sidebar"
            >
              <PanelLeftOpen className="w-4 h-4" />
            </button>
          )}

          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                onClick={onCloseMobile}
                title={isCollapsed ? item.label : undefined}
                className={({ isActive }) =>
                  `group relative flex items-center ${
                    isCollapsed ? 'justify-center px-2' : 'gap-3 px-3'
                  } py-2.5 rounded-xl text-sm font-medium transition-colors whitespace-nowrap shrink-0 min-h-[40px] ${
                    isActive
                      ? 'bg-indigo-50 text-[#4F46E5] dark:bg-indigo-500/15 dark:text-[#818CF8]'
                      : 'text-[#6B7280] dark:text-[#9CA3AF] hover:bg-[#F7F9FC] dark:hover:bg-[#172033] hover:text-[#111827] dark:hover:text-[#F9FAFB]'
                  }`
                }
              >
                <Icon className="w-4 h-4 shrink-0" />
                {!isCollapsed && <span>{item.label}</span>}
                {isCollapsed && (
                  <span
                    role="tooltip"
                    className="pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity absolute left-full ml-3 z-50 px-2.5 py-1.5 rounded-lg bg-[#111827] dark:bg-[#172033] text-white text-xs font-medium shadow-lg border border-[#263247] whitespace-nowrap"
                  >
                    {item.label}
                  </span>
                )}
              </NavLink>
            );
          })}

          {/* 10th Navigation Item: Logout */}
          <button
            type="button"
            title={isCollapsed ? 'Logout' : undefined}
            onClick={() => {
              onCloseMobile();
              onRequestLogout();
            }}
            className={`group relative w-full flex items-center ${
              isCollapsed ? 'justify-center px-2' : 'gap-3 px-3'
            } py-2.5 rounded-xl text-sm font-medium text-[#6B7280] dark:text-[#9CA3AF] hover:bg-red-50 dark:hover:bg-red-950/30 hover:text-[#EF4444] dark:hover:text-red-400 transition-colors whitespace-nowrap shrink-0 min-h-[40px]`}
          >
            <LogOut className="w-4 h-4 shrink-0" />
            {!isCollapsed && <span>Logout</span>}
            {isCollapsed && (
              <span
                role="tooltip"
                className="pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity absolute left-full ml-3 z-50 px-2.5 py-1.5 rounded-lg bg-[#111827] dark:bg-[#172033] text-white text-xs font-medium shadow-lg border border-[#263247] whitespace-nowrap"
              >
                Logout
              </span>
            )}
          </button>
        </nav>

        {/* Account Footer */}
        <div className="p-3 border-t border-[#E5E7EB] dark:border-[#263247] shrink-0">
          <div
            className={`flex items-center ${
              isCollapsed ? 'justify-center px-1' : 'gap-3 px-2'
            } py-1.5 rounded-xl`}
            title={isCollapsed ? `${user?.full_name || 'User'} (${user?.email || ''})` : undefined}
          >
            <div
              className="w-9 h-9 rounded-xl bg-[#4F46E5] dark:bg-indigo-500/20 border border-[#4F46E5]/20 dark:border-[#818CF8]/30 flex items-center justify-center text-sm font-semibold text-white dark:text-[#818CF8] shrink-0"
              aria-hidden="true"
            >
              {firstInitial}
            </div>
            {!isCollapsed && (
              <div className="min-w-0 flex-1">
                <p className="text-xs font-semibold text-[#111827] dark:text-[#F9FAFB] truncate">
                  {user?.full_name}
                </p>
                <p className="text-[11px] text-[#6B7280] dark:text-[#9CA3AF] truncate">
                  {user?.email}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      <aside className="hidden lg:block shrink-0 border-r border-[#E5E7EB] dark:border-[#263247]">
        {renderSidebarBody(false)}
      </aside>

      {mobileOpen && (
        <div className="fixed inset-0 z-40 lg:hidden flex">
          <div
            className="fixed inset-0 bg-[#0B1120]/60 backdrop-blur-xs"
            onClick={onCloseMobile}
            aria-hidden="true"
          />
          <aside className="relative z-50 h-full shadow-2xl border-r border-[#E5E7EB] dark:border-[#263247]">
            {renderSidebarBody(true)}
          </aside>
        </div>
      )}
    </>
  );
}
