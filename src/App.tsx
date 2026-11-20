import React, { useState } from 'react';
import { Navigate, Outlet, Route, Routes, BrowserRouter, useNavigate } from 'react-router-dom';
import ConfirmDialog from './components/ConfirmDialog';
import Navbar from './components/Navbar';
import Sidebar from './components/Sidebar';
import ToastContainer from './components/ToastContainer';
import TransactionForm from './components/TransactionForm';
import { ExpenseProvider, useExpense } from './context/ExpenseContext';
import Analytics from './pages/Analytics';
import Budgets from './pages/Budgets';
import Dashboard from './pages/Dashboard';
import Expenses from './pages/Expenses';
import Income from './pages/Income';
import Login from './pages/Login';
import Register from './pages/Register';
import Reports from './pages/Reports';
import Savings from './pages/Savings';
import Settings from './pages/Settings';
import Transactions from './pages/Transactions';

function FullScreenLoader() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-[#F7F9FC] dark:bg-[#0B1120]">
      <div className="flex flex-col items-center gap-3">
        <div className="w-8 h-8 rounded-full border-2 border-[#4F46E5] dark:border-[#818CF8] border-t-transparent animate-spin" />
        <p className="text-xs font-medium text-[#6B7280] dark:text-[#9CA3AF]">
          Verifying session...
        </p>
      </div>
    </div>
  );
}

function ProtectedShell() {
  const { user, authLoading, logoutSession, notify } = useExpense();
  const navigate = useNavigate();

  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [quickAddOpen, setQuickAddOpen] = useState(false);
  const [logoutConfirmOpen, setLogoutConfirmOpen] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

  if (authLoading) return <FullScreenLoader />;
  if (!user) return <Navigate to="/login" replace />;

  async function handleConfirmLogout() {
    setLoggingOut(true);
    try {
      await logoutSession();
      notify('info', 'You have been logged out.');
      navigate('/login', { replace: true });
    } finally {
      setLoggingOut(false);
      setLogoutConfirmOpen(false);
    }
  }

  return (
    <div className="min-h-screen flex bg-[#F7F9FC] dark:bg-[#0B1120] text-[#111827] dark:text-[#F9FAFB]">
      <Sidebar
        collapsed={sidebarCollapsed}
        onToggleCollapse={() => setSidebarCollapsed((c) => !c)}
        mobileOpen={mobileMenuOpen}
        onCloseMobile={() => setMobileMenuOpen(false)}
        onRequestLogout={() => setLogoutConfirmOpen(true)}
      />

      <div className="flex-1 min-w-0 flex flex-col">
        <Navbar
          onOpenMobileMenu={() => setMobileMenuOpen(true)}
          onOpenQuickAdd={() => setQuickAddOpen(true)}
          onRequestLogout={() => setLogoutConfirmOpen(true)}
        />

        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-[1440px] w-full mx-auto">
          <Outlet />
        </main>
      </div>

      <TransactionForm
        open={quickAddOpen}
        onClose={() => setQuickAddOpen(false)}
        onSaved={() => {}}
      />

      <ConfirmDialog
        open={logoutConfirmOpen}
        title="Are you sure you want to logout?"
        description="Your session will be closed on this device. You can sign back in anytime with your email and password."
        confirmLabel="Logout"
        cancelLabel="Stay Signed In"
        destructive
        loading={loggingOut}
        onConfirm={() => void handleConfirmLogout()}
        onCancel={() => setLogoutConfirmOpen(false)}
      />
    </div>
  );
}

function RootRedirect() {
  const { user, authLoading } = useExpense();
  if (authLoading) return <FullScreenLoader />;
  return <Navigate to={user ? '/dashboard' : '/register'} replace />;
}

function PublicRoute({ children }: { children: React.ReactNode }) {
  const { user, authLoading } = useExpense();
  if (authLoading) return <FullScreenLoader />;
  if (user) return <Navigate to="/dashboard" replace />;
  return <>{children}</>;
}

export default function App() {
  return (
    <ExpenseProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<RootRedirect />} />
          <Route
            path="/register"
            element={
              <PublicRoute>
                <Register />
              </PublicRoute>
            }
          />
          <Route
            path="/login"
            element={
              <PublicRoute>
                <Login />
              </PublicRoute>
            }
          />
          <Route element={<ProtectedShell />}>
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/income" element={<Income />} />
            <Route path="/expenses" element={<Expenses />} />
            <Route path="/transactions" element={<Transactions />} />
            <Route path="/budgets" element={<Budgets />} />
            <Route path="/savings" element={<Savings />} />
            <Route path="/analytics" element={<Analytics />} />
            <Route path="/reports" element={<Reports />} />
            <Route path="/settings" element={<Settings />} />
          </Route>
          <Route path="*" element={<RootRedirect />} />
        </Routes>
        <ToastContainer />
      </BrowserRouter>
    </ExpenseProvider>
  );
}
