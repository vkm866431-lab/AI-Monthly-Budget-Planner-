import React, { useState } from 'react';
import { Bell, Database, Lock, Plus, Trash2, User as UserIcon } from 'lucide-react';
import ConfirmDialog from '../components/ConfirmDialog';
import { useExpense } from '../context/ExpenseContext';
import { api } from '../services/api';
import type { TransactionType } from '../types/finance';

export default function Settings() {
  const {
    user,
    settings,
    categories,
    selectedMonth,
    updateLocalUser,
    updatePreferences,
    reloadCategories,
    triggerRefresh,
    notify,
  } = useExpense();

  const [fullName, setFullName] = useState(user?.full_name || '');
  const [email, setEmail] = useState(user?.email || '');
  const [phone, setPhone] = useState(user?.phone || '');
  const [role, setRole] = useState(user?.role || '');
  const [savingProfile, setSavingProfile] = useState(false);

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [savingPassword, setSavingPassword] = useState(false);

  const [catName, setCatName] = useState('');
  const [catType, setCatType] = useState<TransactionType>('expense');
  const [catColor, setCatColor] = useState('#4F46E5');
  const [addingCat, setAddingCat] = useState(false);

  const [seeding, setSeeding] = useState(false);
  const [clearConfirmOpen, setClearConfirmOpen] = useState(false);
  const [clearing, setClearing] = useState(false);

  async function handleProfileSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSavingProfile(true);
    try {
      const res = await api.settings.updateProfile({
        full_name: fullName.trim(),
        email: email.trim(),
        phone: phone.trim(),
        role: role.trim(),
      });
      updateLocalUser(res.user);
      notify('success', 'Profile updated.');
    } catch (err) {
      notify('error', err instanceof Error ? err.message : 'Unable to update profile.');
    } finally {
      setSavingProfile(false);
    }
  }

  async function handlePasswordSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (newPassword.length < 8) {
      notify('error', 'New password must be at least 8 characters.');
      return;
    }
    if (newPassword !== confirmPassword) {
      notify('error', 'New passwords do not match.');
      return;
    }
    setSavingPassword(true);
    try {
      await api.settings.updatePassword({
        current_password: currentPassword,
        new_password: newPassword,
      });
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      notify('success', 'Password changed successfully.');
    } catch (err) {
      notify('error', err instanceof Error ? err.message : 'Failed to change password.');
    } finally {
      setSavingPassword(false);
    }
  }

  async function handleAddCategory(e: React.FormEvent) {
    e.preventDefault();
    if (catName.trim().length < 2) {
      notify('error', 'Category name must be at least 2 characters.');
      return;
    }
    setAddingCat(true);
    try {
      await api.settings.createCategory({
        name: catName.trim(),
        type: catType,
        color: catColor,
      });
      setCatName('');
      await reloadCategories();
      notify('success', 'Custom category added.');
    } catch (err) {
      notify('error', err instanceof Error ? err.message : 'Unable to create category.');
    } finally {
      setAddingCat(false);
    }
  }

  async function handleSeedSample() {
    setSeeding(true);
    try {
      await api.settings.seedSample(selectedMonth);
      triggerRefresh();
      notify('success', 'Sample semester records loaded into SQLite.');
    } catch (err) {
      notify('error', err instanceof Error ? err.message : 'Failed to load sample records.');
    } finally {
      setSeeding(false);
    }
  }

  async function handleClearData() {
    setClearing(true);
    try {
      await api.settings.clearData();
      setClearConfirmOpen(false);
      triggerRefresh();
      notify('success', 'All transactions, budgets, and savings goals cleared.');
    } catch (err) {
      notify('error', err instanceof Error ? err.message : 'Failed to clear financial data.');
    } finally {
      setClearing(false);
    }
  }

  async function toggleNotification(
    key: 'notify_budget_80' | 'notify_budget_exceeded' | 'notify_goal_complete'
  ) {
    const current = settings[key] !== 0;
    const nextVal = current ? 0 : 1;
    try {
      await updatePreferences({ [key]: nextVal });
      notify('success', 'Notification preference saved.');
    } catch (err) {
      notify('error', err instanceof Error ? err.message : 'Unable to update preference.');
    }
  }

  return (
    <div className="space-y-6 max-w-5xl">
      <div>
        <h2 className="font-display text-lg font-semibold text-[#111827] dark:text-[#F9FAFB]">
          Account & Application Settings
        </h2>
        <p className="text-xs text-[#6B7280] dark:text-[#9CA3AF]">
          Manage your profile, password, currency, alerts, custom categories, and database data.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* User Profile */}
        <section className="rounded-2xl border border-[#E5E7EB] dark:border-[#263247] bg-white dark:bg-[#172033] p-6 shadow-[0_1px_2px_rgba(16,24,40,0.04)]">
          <div className="flex items-center justify-between gap-3 mb-4">
            <div className="flex items-center gap-2.5">
              <UserIcon className="w-4 h-4 text-[#4F46E5] dark:text-[#818CF8]" />
              <h3 className="text-sm font-semibold text-[#111827] dark:text-[#F9FAFB]">
                Profile Information
              </h3>
            </div>
            <div
              className="w-9 h-9 rounded-xl bg-[#4F46E5] text-white text-sm font-semibold flex items-center justify-center shrink-0"
              aria-hidden="true"
            >
              {(fullName.trim().charAt(0) || user?.full_name?.trim().charAt(0) || 'U').toUpperCase()}
            </div>
          </div>

          <form onSubmit={handleProfileSubmit} className="space-y-4">
            <div>
              <label
                htmlFor="set-name"
                className="block text-xs font-medium text-[#111827] dark:text-[#F9FAFB] mb-1.5"
              >
                Full Name
              </label>
              <input
                id="set-name"
                type="text"
                required
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="w-full h-10 rounded-xl border border-[#E5E7EB] dark:border-[#263247] bg-[#F7F9FC] dark:bg-[#0B1120] px-3 text-sm text-[#111827] dark:text-[#F9FAFB]"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label
                  htmlFor="set-email"
                  className="block text-xs font-medium text-[#111827] dark:text-[#F9FAFB] mb-1.5"
                >
                  Email Address
                </label>
                <input
                  id="set-email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full h-10 rounded-xl border border-[#E5E7EB] dark:border-[#263247] bg-[#F7F9FC] dark:bg-[#0B1120] px-3 text-sm text-[#111827] dark:text-[#F9FAFB]"
                />
              </div>

              <div>
                <label
                  htmlFor="set-phone"
                  className="block text-xs font-medium text-[#111827] dark:text-[#F9FAFB] mb-1.5"
                >
                  Phone Number
                </label>
                <input
                  id="set-phone"
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full h-10 rounded-xl border border-[#E5E7EB] dark:border-[#263247] bg-[#F7F9FC] dark:bg-[#0B1120] px-3 text-sm text-[#111827] dark:text-[#F9FAFB]"
                />
              </div>
            </div>

            <div>
              <label
                htmlFor="set-role"
                className="block text-xs font-medium text-[#111827] dark:text-[#F9FAFB] mb-1.5"
              >
                Academic / Professional Role
              </label>
              <input
                id="set-role"
                type="text"
                value={role}
                onChange={(e) => setRole(e.target.value)}
                className="w-full h-10 rounded-xl border border-[#E5E7EB] dark:border-[#263247] bg-[#F7F9FC] dark:bg-[#0B1120] px-3 text-sm text-[#111827] dark:text-[#F9FAFB]"
              />
            </div>

            <button
              type="submit"
              disabled={savingProfile}
              className="px-4 py-2 rounded-xl bg-[#4F46E5] hover:bg-[#4338CA] text-white text-xs font-medium transition-colors disabled:opacity-60"
            >
              {savingProfile ? 'Saving...' : 'Save Profile'}
            </button>
          </form>
        </section>

        {/* Password Change */}
        <section className="rounded-2xl border border-[#E5E7EB] dark:border-[#263247] bg-white dark:bg-[#172033] p-6 shadow-[0_1px_2px_rgba(16,24,40,0.04)]">
          <div className="flex items-center gap-2.5 mb-4">
            <Lock className="w-4 h-4 text-[#4F46E5] dark:text-[#818CF8]" />
            <h3 className="text-sm font-semibold text-[#111827] dark:text-[#F9FAFB]">
              Change Password
            </h3>
          </div>

          <form onSubmit={handlePasswordSubmit} className="space-y-4">
            <div>
              <label
                htmlFor="set-cur-pass"
                className="block text-xs font-medium text-[#111827] dark:text-[#F9FAFB] mb-1.5"
              >
                Current Password
              </label>
              <input
                id="set-cur-pass"
                type="password"
                required
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                className="w-full h-10 rounded-xl border border-[#E5E7EB] dark:border-[#263247] bg-[#F7F9FC] dark:bg-[#0B1120] px-3 text-sm text-[#111827] dark:text-[#F9FAFB]"
              />
            </div>

            <div>
              <label
                htmlFor="set-new-pass"
                className="block text-xs font-medium text-[#111827] dark:text-[#F9FAFB] mb-1.5"
              >
                New Password
              </label>
              <input
                id="set-new-pass"
                type="password"
                required
                minLength={8}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="w-full h-10 rounded-xl border border-[#E5E7EB] dark:border-[#263247] bg-[#F7F9FC] dark:bg-[#0B1120] px-3 text-sm text-[#111827] dark:text-[#F9FAFB]"
              />
            </div>

            <div>
              <label
                htmlFor="set-confirm-pass"
                className="block text-xs font-medium text-[#111827] dark:text-[#F9FAFB] mb-1.5"
              >
                Confirm New Password
              </label>
              <input
                id="set-confirm-pass"
                type="password"
                required
                minLength={8}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full h-10 rounded-xl border border-[#E5E7EB] dark:border-[#263247] bg-[#F7F9FC] dark:bg-[#0B1120] px-3 text-sm text-[#111827] dark:text-[#F9FAFB]"
              />
            </div>

            <button
              type="submit"
              disabled={savingPassword}
              className="px-4 py-2 rounded-xl bg-[#111827] dark:bg-[#263247] hover:bg-slate-800 dark:hover:bg-slate-700 text-white text-xs font-medium transition-colors disabled:opacity-60"
            >
              {savingPassword ? 'Updating...' : 'Update Password'}
            </button>
          </form>
        </section>
      </div>

      {/* Preferences & Notification Alerts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <section className="rounded-2xl border border-[#E5E7EB] dark:border-[#263247] bg-white dark:bg-[#172033] p-6 space-y-4 shadow-[0_1px_2px_rgba(16,24,40,0.04)]">
          <h3 className="text-sm font-semibold text-[#111827] dark:text-[#F9FAFB]">
            Display & Regional Preferences
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label
                htmlFor="pref-currency"
                className="block text-xs font-medium text-[#111827] dark:text-[#F9FAFB] mb-1.5"
              >
                Currency
              </label>
              <select
                id="pref-currency"
                value={settings.currency}
                onChange={(e) => {
                  void updatePreferences({ currency: e.target.value });
                  notify('success', 'Currency preference saved.');
                }}
                className="w-full h-10 rounded-xl border border-[#E5E7EB] dark:border-[#263247] bg-[#F7F9FC] dark:bg-[#0B1120] px-3 text-sm text-[#111827] dark:text-[#F9FAFB]"
              >
                <option value="INR">INR (₹)</option>
                <option value="USD">USD ($)</option>
                <option value="EUR">EUR (€)</option>
                <option value="GBP">GBP (£)</option>
              </select>
            </div>

            <div>
              <label
                htmlFor="pref-date"
                className="block text-xs font-medium text-[#111827] dark:text-[#F9FAFB] mb-1.5"
              >
                Date Format
              </label>
              <select
                id="pref-date"
                value={settings.date_format}
                onChange={(e) => {
                  void updatePreferences({ date_format: e.target.value });
                  notify('success', 'Date format updated.');
                }}
                className="w-full h-10 rounded-xl border border-[#E5E7EB] dark:border-[#263247] bg-[#F7F9FC] dark:bg-[#0B1120] px-3 text-sm text-[#111827] dark:text-[#F9FAFB]"
              >
                <option value="DD/MM/YYYY">DD/MM/YYYY</option>
                <option value="MM/DD/YYYY">MM/DD/YYYY</option>
                <option value="YYYY-MM-DD">YYYY-MM-DD</option>
              </select>
            </div>
          </div>

          <div>
            <span className="block text-xs font-medium text-[#111827] dark:text-[#F9FAFB] mb-1.5">
              Appearance Theme
            </span>
            <div className="inline-flex p-1 rounded-xl bg-[#F7F9FC] dark:bg-[#0B1120] border border-[#E5E7EB] dark:border-[#263247]">
              {(['light', 'dark'] as const).map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => {
                    void updatePreferences({ theme: t });
                    notify('success', `${t === 'dark' ? 'Dark' : 'Light'} mode enabled.`);
                  }}
                  className={`px-4 py-1.5 rounded-lg text-xs font-medium capitalize transition-colors ${
                    settings.theme === t
                      ? 'bg-white dark:bg-[#172033] text-[#111827] dark:text-[#F9FAFB] shadow-xs'
                      : 'text-[#6B7280] dark:text-[#9CA3AF]'
                  }`}
                >
                  {t} Mode
                </button>
              ))}
            </div>
          </div>
        </section>

        {/* Notification Preferences */}
        <section className="rounded-2xl border border-[#E5E7EB] dark:border-[#263247] bg-white dark:bg-[#172033] p-6 space-y-4 shadow-[0_1px_2px_rgba(16,24,40,0.04)]">
          <div className="flex items-center gap-2.5">
            <Bell className="w-4 h-4 text-[#4F46E5] dark:text-[#818CF8]" />
            <h3 className="text-sm font-semibold text-[#111827] dark:text-[#F9FAFB]">
              Notification Preferences
            </h3>
          </div>

          <div className="space-y-3">
            {[
              {
                key: 'notify_budget_80' as const,
                title: '80% Budget Warnings',
                description: 'Show alert when a category crosses 80% of its monthly limit.',
              },
              {
                key: 'notify_budget_exceeded' as const,
                title: 'Exceeded Budget Alerts',
                description: 'Notify immediately when spending goes past 100% of a budget.',
              },
              {
                key: 'notify_goal_complete' as const,
                title: 'Savings Goal Completions',
                description: 'Highlight completed savings goals in your notification center.',
              },
            ].map((item) => {
              const enabled = settings[item.key] !== 0;
              return (
                <label
                  key={item.key}
                  className="flex items-start justify-between gap-4 p-3 rounded-xl border border-[#E5E7EB] dark:border-[#263247] bg-[#F7F9FC]/60 dark:bg-[#0B1120]/50 cursor-pointer"
                >
                  <div>
                    <p className="text-xs font-semibold text-[#111827] dark:text-[#F9FAFB]">
                      {item.title}
                    </p>
                    <p className="text-[11px] text-[#6B7280] dark:text-[#9CA3AF] mt-0.5">
                      {item.description}
                    </p>
                  </div>
                  <input
                    type="checkbox"
                    checked={enabled}
                    onChange={() => void toggleNotification(item.key)}
                    className="mt-0.5 h-4 w-4 rounded border-[#E5E7EB] text-[#4F46E5] focus:ring-[#4F46E5] shrink-0"
                  />
                </label>
              );
            })}
          </div>
        </section>
      </div>

      {/* Custom Categories */}
      <section className="rounded-2xl border border-[#E5E7EB] dark:border-[#263247] bg-white dark:bg-[#172033] p-6 space-y-4 shadow-[0_1px_2px_rgba(16,24,40,0.04)]">
        <h3 className="text-sm font-semibold text-[#111827] dark:text-[#F9FAFB]">
          Categories ({categories.length})
        </h3>

        <form onSubmit={handleAddCategory} className="flex flex-wrap items-center gap-2">
          <input
            type="text"
            value={catName}
            onChange={(e) => setCatName(e.target.value)}
            placeholder="New category name"
            required
            className="flex-1 min-w-[160px] h-9 rounded-xl border border-[#E5E7EB] dark:border-[#263247] bg-[#F7F9FC] dark:bg-[#0B1120] px-3 text-xs text-[#111827] dark:text-[#F9FAFB]"
          />
          <select
            value={catType}
            onChange={(e) => setCatType(e.target.value as TransactionType)}
            className="h-9 rounded-xl border border-[#E5E7EB] dark:border-[#263247] bg-[#F7F9FC] dark:bg-[#0B1120] px-2.5 text-xs text-[#111827] dark:text-[#F9FAFB]"
          >
            <option value="expense">Expense</option>
            <option value="income">Income</option>
          </select>
          <input
            type="color"
            value={catColor}
            onChange={(e) => setCatColor(e.target.value)}
            aria-label="Category color"
            className="h-9 w-10 rounded-xl border border-[#E5E7EB] dark:border-[#263247] bg-transparent cursor-pointer"
          />
          <button
            type="submit"
            disabled={addingCat}
            className="h-9 px-3.5 rounded-xl bg-[#4F46E5] hover:bg-[#4338CA] text-white text-xs font-medium inline-flex items-center gap-1 whitespace-nowrap"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add</span>
          </button>
        </form>

        <div className="space-y-1.5 text-xs text-[#6B7280] dark:text-[#9CA3AF] leading-relaxed">
          <p>
            <strong className="text-[#111827] dark:text-[#F9FAFB]">Expense:</strong>{' '}
            {categories
              .filter((c) => c.type === 'expense')
              .map((c) => c.name)
              .join(' · ')}
          </p>
          <p>
            <strong className="text-[#111827] dark:text-[#F9FAFB]">Income:</strong>{' '}
            {categories
              .filter((c) => c.type === 'income')
              .map((c) => c.name)
              .join(' · ')}
          </p>
        </div>
      </section>

      {/* Data Management */}
      <section className="rounded-2xl border border-[#E5E7EB] dark:border-[#263247] bg-white dark:bg-[#172033] p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-[0_1px_2px_rgba(16,24,40,0.04)]">
        <div>
          <h3 className="text-sm font-semibold text-[#111827] dark:text-[#F9FAFB]">
            SQLite Data Management
          </h3>
          <p className="mt-1 text-xs text-[#6B7280] dark:text-[#9CA3AF]">
            Load optional IIT Patna semester sample data for presentation, or reset your ledger.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 shrink-0">
          <button
            type="button"
            disabled={seeding}
            onClick={() => void handleSeedSample()}
            className="h-9 px-3.5 rounded-xl border border-[#E5E7EB] dark:border-[#263247] hover:bg-[#F7F9FC] dark:hover:bg-[#1E293B] text-xs font-medium text-[#111827] dark:text-[#F9FAFB] inline-flex items-center gap-1.5 whitespace-nowrap disabled:opacity-60"
          >
            <Database className="w-3.5 h-3.5" />
            <span>{seeding ? 'Seeding...' : 'Load Sample Data'}</span>
          </button>

          <button
            type="button"
            onClick={() => setClearConfirmOpen(true)}
            className="h-9 px-3.5 rounded-xl border border-[#EF4444]/30 dark:border-red-900 bg-red-50 dark:bg-red-950/40 hover:bg-red-100 dark:hover:bg-red-950/70 text-xs font-medium text-[#EF4444] dark:text-red-300 inline-flex items-center gap-1.5 whitespace-nowrap"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Clear Financial Data</span>
          </button>
        </div>
      </section>

      <ConfirmDialog
        open={clearConfirmOpen}
        title="Clear all financial data?"
        description="This permanently deletes all transactions, monthly budgets, and savings goals from your account in SQLite. Your login profile and categories will remain intact."
        confirmLabel="Clear All Data"
        loading={clearing}
        onConfirm={() => void handleClearData()}
        onCancel={() => setClearConfirmOpen(false)}
      />
    </div>
  );
}
