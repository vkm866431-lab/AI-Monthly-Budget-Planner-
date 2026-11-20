import { Router } from 'express';
import type { Response } from 'express';
import PDFDocument from 'pdfkit';
import { db } from '../db.ts';
import { requireAuth } from '../middleware/auth.ts';
import type { AuthenticatedRequest } from '../middleware/auth.ts';

const router = Router();
router.use(requireAuth);

function getDefaultMonth(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

function getRecentMonths(endMonth: string, count: number): string[] {
  const [y, m] = endMonth.split('-').map(Number);
  const months: string[] = [];
  for (let i = count - 1; i >= 0; i--) {
    const d = new Date(y, m - 1 - i, 1);
    months.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
  }
  return months;
}

function formatPdfMoney(amount: number, currency: string): string {
  const prefix =
    currency === 'INR'
      ? 'Rs. '
      : currency === 'USD'
      ? '$ '
      : currency === 'EUR'
      ? 'EUR '
      : currency === 'GBP'
      ? 'GBP '
      : `${currency} `;
  return `${prefix}${amount.toLocaleString('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function csvEscape(val: unknown): string {
  const str = String(val ?? '');
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

router.get('/dashboard', (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const month = /^\d{4}-\d{2}$/.test(String(req.query.month || ''))
      ? String(req.query.month)
      : getDefaultMonth();

    const [yNum, mNum] = month.split('-').map(Number);
    const prevDate = new Date(yNum, mNum - 2, 1);
    const prevMonth = `${prevDate.getFullYear()}-${String(prevDate.getMonth() + 1).padStart(2, '0')}`;

    const monthTotals = db
      .prepare(
        `SELECT
          COALESCE(SUM(CASE WHEN type = 'income' THEN amount ELSE 0 END), 0) as monthly_income,
          COALESCE(SUM(CASE WHEN type = 'expense' THEN amount ELSE 0 END), 0) as monthly_expense
         FROM transactions
         WHERE user_id = ? AND substr(date, 1, 7) = ?`
      )
      .get(userId, month) as { monthly_income: number; monthly_expense: number };

    const prevTotals = db
      .prepare(
        `SELECT
          COALESCE(SUM(CASE WHEN type = 'income' THEN amount ELSE 0 END), 0) as prev_income,
          COALESCE(SUM(CASE WHEN type = 'expense' THEN amount ELSE 0 END), 0) as prev_expense
         FROM transactions
         WHERE user_id = ? AND substr(date, 1, 7) = ?`
      )
      .get(userId, prevMonth) as { prev_income: number; prev_expense: number };

    const allTimeTotals = db
      .prepare(
        `SELECT
          COALESCE(SUM(CASE WHEN type = 'income' THEN amount ELSE 0 END), 0) as total_income,
          COALESCE(SUM(CASE WHEN type = 'expense' THEN amount ELSE 0 END), 0) as total_expense
         FROM transactions
         WHERE user_id = ?`
      )
      .get(userId) as { total_income: number; total_expense: number };

    const savingsRow = db
      .prepare(
        `SELECT COALESCE(SUM(current_amount), 0) as total_saved,
                COALESCE(SUM(target_amount), 0) as total_target,
                COUNT(*) as total_goals,
                COALESCE(SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END), 0) as completed_goals
         FROM savings_goals
         WHERE user_id = ?`
      )
      .get(userId) as {
      total_saved: number;
      total_target: number;
      total_goals: number;
      completed_goals: number;
    };

    const monthlyIncome = Number(monthTotals.monthly_income);
    const monthlyExpense = Number(monthTotals.monthly_expense);
    const netMonthlyBalance = Math.round((monthlyIncome - monthlyExpense) * 100) / 100;
    const savingsRate =
      monthlyIncome > 0
        ? Math.round(((monthlyIncome - monthlyExpense) / monthlyIncome) * 1000) / 10
        : 0;
    const availableBalance =
      Math.round((Number(allTimeTotals.total_income) - Number(allTimeTotals.total_expense)) * 100) / 100;

    // 6-month trend
    const monthsList = getRecentMonths(month, 6);
    const trendRows = db
      .prepare(
        `SELECT substr(date, 1, 7) as ym,
                COALESCE(SUM(CASE WHEN type = 'income' THEN amount ELSE 0 END), 0) as income,
                COALESCE(SUM(CASE WHEN type = 'expense' THEN amount ELSE 0 END), 0) as expense
         FROM transactions
         WHERE user_id = ? AND substr(date, 1, 7) IN (${monthsList.map(() => '?').join(',')})
         GROUP BY ym`
      )
      .all(userId, ...monthsList) as Array<{ ym: string; income: number; expense: number }>;

    const trendMap = new Map(trendRows.map((r) => [r.ym, r]));
    const monthlyTrend = monthsList.map((ym) => {
      const row = trendMap.get(ym);
      const inc = row ? Number(row.income) : 0;
      const exp = row ? Number(row.expense) : 0;
      return {
        month: ym,
        income: inc,
        expense: exp,
        net: Math.round((inc - exp) * 100) / 100,
      };
    });

    // Category-wise expenses for selected month
    const categoryBreakdown = db
      .prepare(
        `SELECT c.id as category_id, c.name as category_name, c.color as category_color,
                COALESCE(SUM(t.amount), 0) as total, COUNT(t.id) as tx_count
         FROM transactions t
         JOIN categories c ON c.id = t.category_id
         WHERE t.user_id = ? AND t.type = 'expense' AND substr(t.date, 1, 7) = ?
         GROUP BY c.id
         ORDER BY total DESC`
      )
      .all(userId, month) as Array<{
      category_id: number;
      category_name: string;
      category_color: string;
      total: number;
      tx_count: number;
    }>;

    // Budget utilization for selected month
    const budgetRows = db
      .prepare(
        `SELECT b.id, b.category_id, b.limit_amount, c.name as category_name, c.color as category_color,
                COALESCE(SUM(t.amount), 0) as spent_amount
         FROM budgets b
         JOIN categories c ON c.id = b.category_id
         LEFT JOIN transactions t
           ON t.category_id = b.category_id
          AND t.user_id = b.user_id
          AND t.type = 'expense'
          AND substr(t.date, 1, 7) = b.month
         WHERE b.user_id = ? AND b.month = ?
         GROUP BY b.id
         ORDER BY (COALESCE(SUM(t.amount), 0) / b.limit_amount) DESC`
      )
      .all(userId, month) as Array<{
      id: number;
      category_id: number;
      limit_amount: number;
      category_name: string;
      category_color: string;
      spent_amount: number;
    }>;

    const budgets = budgetRows.map((b) => {
      const limit = Number(b.limit_amount);
      const spent = Number(b.spent_amount);
      const utilization = limit > 0 ? Math.round((spent / limit) * 1000) / 10 : 0;
      const status = utilization > 100 ? 'exceeded' : utilization >= 80 ? 'warning' : 'normal';
      return {
        id: Number(b.id),
        category_id: Number(b.category_id),
        category_name: b.category_name,
        category_color: b.category_color,
        limit_amount: limit,
        spent_amount: spent,
        remaining_amount: Math.round((limit - spent) * 100) / 100,
        utilization_percent: utilization,
        status,
      };
    });

    const recentTransactions = db
      .prepare(
        `SELECT t.id, t.type, t.amount, t.date, t.source_or_method, t.description,
                c.name as category_name, c.color as category_color, t.category_id
         FROM transactions t
         JOIN categories c ON c.id = t.category_id
         WHERE t.user_id = ?
         ORDER BY t.date DESC, t.id DESC
         LIMIT 8`
      )
      .all(userId);

    const totalBudgeted = budgets.reduce((s, b) => s + b.limit_amount, 0);
    const totalBudgetSpent = budgets.reduce((s, b) => s + b.spent_amount, 0);

    const prevIncome = Number(prevTotals.prev_income);
    const prevExpense = Number(prevTotals.prev_expense);
    const incomeChangePercent =
      prevIncome > 0 ? Math.round(((monthlyIncome - prevIncome) / prevIncome) * 1000) / 10 : null;
    const expenseChangePercent =
      prevExpense > 0
        ? Math.round(((monthlyExpense - prevExpense) / prevExpense) * 1000) / 10
        : null;

    res.json({
      month,
      kpis: {
        monthly_income: monthlyIncome,
        monthly_expense: monthlyExpense,
        prev_month_income: prevIncome,
        prev_month_expense: prevExpense,
        income_change_percent: incomeChangePercent,
        expense_change_percent: expenseChangePercent,
        monthly_balance: netMonthlyBalance,
        available_balance: availableBalance,
        total_savings: Number(savingsRow.total_saved),
        savings_target: Number(savingsRow.total_target),
        savings_rate: savingsRate,
        total_goals: Number(savingsRow.total_goals),
        completed_goals: Number(savingsRow.completed_goals),
        total_budgeted: Math.round(totalBudgeted * 100) / 100,
        total_budget_spent: Math.round(totalBudgetSpent * 100) / 100,
        budget_utilization:
          totalBudgeted > 0 ? Math.round((totalBudgetSpent / totalBudgeted) * 1000) / 10 : 0,
      },
      monthly_trend: monthlyTrend,
      category_breakdown: categoryBreakdown.map((c) => ({
        ...c,
        category_id: Number(c.category_id),
        total: Number(c.total),
        tx_count: Number(c.tx_count),
      })),
      budgets,
      recent_transactions: recentTransactions,
    });
  } catch (err) {
    console.error('Dashboard error:', err);
    res.status(500).json({ error: 'Failed to load dashboard overview.' });
  }
});

router.get('/charts', (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const year = /^\d{4}$/.test(String(req.query.year || ''))
      ? String(req.query.year)
      : String(new Date().getFullYear());
    const month = /^\d{4}-\d{2}$/.test(String(req.query.month || ''))
      ? String(req.query.month)
      : getDefaultMonth();

    const monthsOfYear = Array.from({ length: 12 }, (_, idx) => `${year}-${String(idx + 1).padStart(2, '0')}`);

    const yearlyRows = db
      .prepare(
        `SELECT substr(date, 1, 7) as ym,
                COALESCE(SUM(CASE WHEN type = 'income' THEN amount ELSE 0 END), 0) as income,
                COALESCE(SUM(CASE WHEN type = 'expense' THEN amount ELSE 0 END), 0) as expense
         FROM transactions
         WHERE user_id = ? AND substr(date, 1, 4) = ?
         GROUP BY ym`
      )
      .all(userId, year) as Array<{ ym: string; income: number; expense: number }>;

    const ymMap = new Map(yearlyRows.map((r) => [r.ym, r]));
    const monthlySeries = monthsOfYear.map((ym) => {
      const r = ymMap.get(ym);
      const income = r ? Number(r.income) : 0;
      const expense = r ? Number(r.expense) : 0;
      return {
        month: ym,
        income,
        expense,
        savings: Math.round((income - expense) * 100) / 100,
      };
    });

    const categoryExpenses = db
      .prepare(
        `SELECT c.name as category_name, c.color as category_color,
                COALESCE(SUM(t.amount), 0) as total, COUNT(t.id) as count
         FROM transactions t
         JOIN categories c ON c.id = t.category_id
         WHERE t.user_id = ? AND t.type = 'expense' AND substr(t.date, 1, 4) = ?
         GROUP BY c.id
         ORDER BY total DESC`
      )
      .all(userId, year) as Array<{
      category_name: string;
      category_color: string;
      total: number;
      count: number;
    }>;

    const budgetVsActual = db
      .prepare(
        `SELECT c.name as category_name, b.limit_amount as budgeted,
                COALESCE(SUM(t.amount), 0) as actual
         FROM budgets b
         JOIN categories c ON c.id = b.category_id
         LEFT JOIN transactions t
           ON t.category_id = b.category_id
          AND t.user_id = b.user_id
          AND t.type = 'expense'
          AND substr(t.date, 1, 7) = b.month
         WHERE b.user_id = ? AND b.month = ?
         GROUP BY b.id
         ORDER BY b.limit_amount DESC`
      )
      .all(userId, month) as Array<{ category_name: string; budgeted: number; actual: number }>;

    const savingsProgress = db
      .prepare(
        `SELECT goal_name, target_amount, current_amount, status, target_date
         FROM savings_goals
         WHERE user_id = ?
         ORDER BY target_date ASC`
      )
      .all(userId) as Array<{
      goal_name: string;
      target_amount: number;
      current_amount: number;
      status: string;
      target_date: string;
    }>;

    res.json({
      year,
      month,
      monthly_series: monthlySeries,
      category_expenses: categoryExpenses.map((c) => ({
        ...c,
        total: Number(c.total),
        count: Number(c.count),
      })),
      budget_vs_actual: budgetVsActual.map((b) => ({
        category_name: b.category_name,
        budgeted: Number(b.budgeted),
        actual: Number(b.actual),
      })),
      savings_progress: savingsProgress.map((g) => ({
        ...g,
        target_amount: Number(g.target_amount),
        current_amount: Number(g.current_amount),
      })),
    });
  } catch (err) {
    console.error('Analytics charts error:', err);
    res.status(500).json({ error: 'Failed to load analytics data.' });
  }
});

function buildReportData(userId: number, period: 'monthly' | 'yearly', value: string) {
  const dateFilter = period === 'yearly' ? 'substr(t.date, 1, 4) = ?' : 'substr(t.date, 1, 7) = ?';

  const totals = db
    .prepare(
      `SELECT
        COALESCE(SUM(CASE WHEN t.type = 'income' THEN t.amount ELSE 0 END), 0) as total_income,
        COALESCE(SUM(CASE WHEN t.type = 'expense' THEN t.amount ELSE 0 END), 0) as total_expense,
        COUNT(*) as transaction_count
       FROM transactions t
       WHERE t.user_id = ? AND ${dateFilter}`
    )
    .get(userId, value) as {
    total_income: number;
    total_expense: number;
    transaction_count: number;
  };

  const categoryBreakdown = db
    .prepare(
      `SELECT c.name as category_name, c.type, c.color as category_color,
              COALESCE(SUM(t.amount), 0) as total, COUNT(t.id) as tx_count
       FROM transactions t
       JOIN categories c ON c.id = t.category_id
       WHERE t.user_id = ? AND ${dateFilter}
       GROUP BY c.id, t.type
       ORDER BY t.type ASC, total DESC`
    )
    .all(userId, value) as Array<{
    category_name: string;
    type: 'income' | 'expense';
    category_color: string;
    total: number;
    tx_count: number;
  }>;

  const transactions = db
    .prepare(
      `SELECT t.id, t.type, t.amount, t.date, t.source_or_method, t.description,
              c.name as category_name
       FROM transactions t
       JOIN categories c ON c.id = t.category_id
       WHERE t.user_id = ? AND ${dateFilter}
       ORDER BY t.date DESC, t.id DESC`
    )
    .all(userId, value) as Array<{
    id: number;
    type: string;
    amount: number;
    date: string;
    source_or_method: string;
    description: string;
    category_name: string;
  }>;

  const totalIncome = Number(totals.total_income);
  const totalExpense = Number(totals.total_expense);
  const netBalance = Math.round((totalIncome - totalExpense) * 100) / 100;

  return {
    period,
    value,
    summary: {
      total_income: totalIncome,
      total_expense: totalExpense,
      net_balance: netBalance,
      savings_rate:
        totalIncome > 0 ? Math.round(((totalIncome - totalExpense) / totalIncome) * 1000) / 10 : 0,
      transaction_count: Number(totals.transaction_count),
    },
    category_breakdown: categoryBreakdown.map((c) => ({
      ...c,
      total: Number(c.total),
      tx_count: Number(c.tx_count),
    })),
    transactions: transactions.map((t) => ({
      ...t,
      id: Number(t.id),
      amount: Number(t.amount),
    })),
  };
}

router.get('/report', (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const period = req.query.period === 'yearly' ? 'yearly' : 'monthly';
    const defaultVal =
      period === 'yearly' ? String(new Date().getFullYear()) : getDefaultMonth();
    const value = String(req.query.value || defaultVal);

    if (period === 'monthly' && !/^\d{4}-\d{2}$/.test(value)) {
      res.status(400).json({ error: 'Invalid month format. Expected YYYY-MM.' });
      return;
    }
    if (period === 'yearly' && !/^\d{4}$/.test(value)) {
      res.status(400).json({ error: 'Invalid year format. Expected YYYY.' });
      return;
    }

    res.json(buildReportData(userId, period, value));
  } catch (err) {
    console.error('Report error:', err);
    res.status(500).json({ error: 'Failed to generate report.' });
  }
});

router.get('/report/csv', (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const period = req.query.period === 'yearly' ? 'yearly' : 'monthly';
    const defaultVal =
      period === 'yearly' ? String(new Date().getFullYear()) : getDefaultMonth();
    const value = String(req.query.value || defaultVal);

    const report = buildReportData(userId, period, value);
    const settings = db
      .prepare('SELECT currency FROM settings WHERE user_id = ?')
      .get(userId) as { currency: string } | undefined;
    const currency = settings?.currency || 'INR';

    const lines: string[] = [];
    lines.push(['Monthly Budget Planner Financial Report', `${period.toUpperCase()} (${value})`, `Currency: ${currency}`].map(csvEscape).join(','));
    lines.push('');
    lines.push(['Summary Metric', 'Amount'].map(csvEscape).join(','));
    lines.push(['Total Income', report.summary.total_income.toFixed(2)].map(csvEscape).join(','));
    lines.push(['Total Expenses', report.summary.total_expense.toFixed(2)].map(csvEscape).join(','));
    lines.push(['Net Balance', report.summary.net_balance.toFixed(2)].map(csvEscape).join(','));
    lines.push(['Savings Rate (%)', `${report.summary.savings_rate}%`].map(csvEscape).join(','));
    lines.push('');
    lines.push(['Category Breakdown', 'Type', 'Transactions', 'Total Amount'].map(csvEscape).join(','));
    for (const c of report.category_breakdown) {
      lines.push([c.category_name, c.type, c.tx_count, c.total.toFixed(2)].map(csvEscape).join(','));
    }
    lines.push('');
    lines.push(['Date', 'Type', 'Category', 'Source / Payment Method', 'Description', 'Amount'].map(csvEscape).join(','));
    for (const tx of report.transactions) {
      lines.push(
        [tx.date, tx.type, tx.category_name, tx.source_or_method, tx.description, tx.amount.toFixed(2)]
          .map(csvEscape)
          .join(',')
      );
    }

    const filename = `budget-report-${period}-${value}.csv`;
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(lines.join('\n'));
  } catch (err) {
    console.error('CSV export error:', err);
    res.status(500).json({ error: 'Failed to export CSV report.' });
  }
});

router.get('/report/pdf', (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const period = req.query.period === 'yearly' ? 'yearly' : 'monthly';
    const defaultVal =
      period === 'yearly' ? String(new Date().getFullYear()) : getDefaultMonth();
    const value = String(req.query.value || defaultVal);

    const report = buildReportData(userId, period, value);
    const settings = db
      .prepare('SELECT currency FROM settings WHERE user_id = ?')
      .get(userId) as { currency: string } | undefined;
    const currency = settings?.currency || 'INR';

    const filename = `budget-report-${period}-${value}.pdf`;
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

    const doc = new PDFDocument({ margin: 48, size: 'A4' });
    doc.pipe(res);

    // Header bar
    doc.rect(0, 0, doc.page.width, 88).fill('#0F172A');
    doc.fillColor('#FFFFFF').fontSize(20).font('Helvetica-Bold').text('Monthly Budget Planner', 48, 24);
    doc
      .fillColor('#CBD5E1')
      .fontSize(10)
      .font('Helvetica')
      .text(
        `${period === 'yearly' ? 'Annual' : 'Monthly'} Financial Report · Period: ${value} · Account: ${req.user!.full_name}`,
        48,
        52
      );

    doc.moveDown(3.2);
    doc.fillColor('#0F172A').fontSize(13).font('Helvetica-Bold').text('Executive Summary', 48);
    doc.moveDown(0.5);

    const summaryY = doc.y;
    const colW = 122;
    const cards = [
      { label: 'Total Income', val: formatPdfMoney(report.summary.total_income, currency), color: '#16A34A' },
      { label: 'Total Expenses', val: formatPdfMoney(report.summary.total_expense, currency), color: '#DC2626' },
      { label: 'Net Balance', val: formatPdfMoney(report.summary.net_balance, currency), color: '#2563EB' },
      { label: 'Savings Rate', val: `${report.summary.savings_rate}%`, color: '#0F172A' },
    ];

    cards.forEach((card, idx) => {
      const x = 48 + idx * (colW + 8);
      doc.roundedRect(x, summaryY, colW, 54, 4).strokeColor('#CBD5E1').lineWidth(0.8).stroke();
      doc.fillColor('#64748B').fontSize(8.5).font('Helvetica').text(card.label, x + 10, summaryY + 10);
      doc.fillColor(card.color).fontSize(11).font('Helvetica-Bold').text(card.val, x + 10, summaryY + 28, {
        width: colW - 18,
      });
    });

    doc.y = summaryY + 76;

    // Category Breakdown
    doc.fillColor('#0F172A').fontSize(13).font('Helvetica-Bold').text('Category Breakdown', 48);
    doc.moveDown(0.4);

    if (report.category_breakdown.length === 0) {
      doc.fillColor('#64748B').fontSize(10).font('Helvetica').text('No transactions recorded for this period.');
    } else {
      const tableTop = doc.y;
      doc.rect(48, tableTop, 498, 22).fill('#F1F5F9');
      doc.fillColor('#334155').fontSize(9).font('Helvetica-Bold');
      doc.text('Category', 56, tableTop + 6);
      doc.text('Type', 230, tableTop + 6);
      doc.text('Entries', 320, tableTop + 6);
      doc.text('Total Amount', 410, tableTop + 6, { width: 126, align: 'right' });

      let rowY = tableTop + 26;
      doc.font('Helvetica').fontSize(9);
      for (const item of report.category_breakdown) {
        if (rowY > 740) {
          doc.addPage();
          rowY = 48;
        }
        doc.fillColor('#0F172A').text(item.category_name, 56, rowY);
        doc.fillColor('#475569').text(item.type.toUpperCase(), 230, rowY);
        doc.text(String(item.tx_count), 320, rowY);
        doc.fillColor(item.type === 'income' ? '#16A34A' : '#0F172A').text(
          formatPdfMoney(item.total, currency),
          410,
          rowY,
          { width: 126, align: 'right' }
        );
        rowY += 18;
      }
      doc.y = rowY + 12;
    }

    // Transaction Ledger
    if (doc.y > 680) doc.addPage();
    doc.fillColor('#0F172A').fontSize(13).font('Helvetica-Bold').text('Transaction Ledger', 48);
    doc.moveDown(0.4);

    if (report.transactions.length === 0) {
      doc.fillColor('#64748B').fontSize(10).font('Helvetica').text('No individual transactions recorded.');
    } else {
      const headerY = doc.y;
      doc.rect(48, headerY, 498, 22).fill('#F1F5F9');
      doc.fillColor('#334155').fontSize(8.5).font('Helvetica-Bold');
      doc.text('Date', 54, headerY + 7);
      doc.text('Category', 120, headerY + 7);
      doc.text('Method / Source', 210, headerY + 7);
      doc.text('Description', 310, headerY + 7);
      doc.text('Amount', 445, headerY + 7, { width: 92, align: 'right' });

      let rowY = headerY + 26;
      doc.font('Helvetica').fontSize(8.5);
      for (const tx of report.transactions.slice(0, 60)) {
        if (rowY > 750) {
          doc.addPage();
          rowY = 48;
        }
        doc.fillColor('#334155').text(tx.date, 54, rowY);
        doc.fillColor('#0F172A').text(tx.category_name, 120, rowY, { width: 85 });
        doc.fillColor('#475569').text(tx.source_or_method || '-', 210, rowY, { width: 95 });
        doc.text((tx.description || '-').slice(0, 32), 310, rowY, { width: 130 });
        doc.fillColor(tx.type === 'income' ? '#16A34A' : '#DC2626').text(
          `${tx.type === 'income' ? '+' : '-'}${formatPdfMoney(tx.amount, currency)}`,
          445,
          rowY,
          { width: 92, align: 'right' }
        );
        rowY += 17;
      }
    }

    doc.end();
  } catch (err) {
    console.error('PDF export error:', err);
    res.status(500).json({ error: 'Failed to generate PDF report.' });
  }
});

export default router;
