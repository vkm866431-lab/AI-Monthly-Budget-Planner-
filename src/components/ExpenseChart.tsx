import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { useExpense } from '../context/ExpenseContext';
import { formatMoney, formatMonthLabel } from '../utils/format';

function useRechartsTheme() {
  const { settings } = useExpense();
  const isDark = settings.theme === 'dark';
  return {
    isDark,
    symbol: settings.currency_symbol,
    currency: settings.currency,
    axisText: isDark ? '#9CA3AF' : '#6B7280',
    gridStroke: isDark ? 'rgba(156, 163, 175, 0.12)' : '#E5E7EB',
    tooltipStyle: {
      backgroundColor: isDark ? '#111827' : '#FFFFFF',
      borderColor: isDark ? '#263247' : '#E5E7EB',
      borderRadius: '12px',
      color: isDark ? '#F9FAFB' : '#111827',
      fontSize: '12px',
      boxShadow: '0 10px 25px -5px rgba(15, 23, 42, 0.14)',
    },
  };
}

export function IncomeExpenseBarChart({
  data,
}: {
  data: Array<{ month: string; income: number; expense: number }>;
}) {
  const theme = useRechartsTheme();
  const chartData = data.map((d) => ({
    ...d,
    label: formatMonthLabel(d.month),
  }));

  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={chartData} margin={{ top: 8, right: 12, left: 4, bottom: 4 }}>
        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={theme.gridStroke} />
        <XAxis
          dataKey="label"
          tick={{ fill: theme.axisText, fontSize: 11 }}
          axisLine={false}
          tickLine={false}
        />
        <YAxis
          tick={{ fill: theme.axisText, fontSize: 11 }}
          axisLine={false}
          tickLine={false}
          tickFormatter={(v) => `${theme.symbol}${Number(v).toLocaleString('en-IN')}`}
        />
        <Tooltip
          contentStyle={theme.tooltipStyle}
          formatter={(value) => formatMoney(Number(value), theme.symbol, theme.currency)}
        />
        <Legend wrapperStyle={{ fontSize: '12px' }} />
        <Bar dataKey="income" name="Income" fill="#16A34A" radius={[6, 6, 0, 0]} maxBarSize={30} />
        <Bar
          dataKey="expense"
          name="Expenses"
          fill={theme.isDark ? '#818CF8' : '#4F46E5'}
          radius={[6, 6, 0, 0]}
          maxBarSize={30}
        />
      </BarChart>
    </ResponsiveContainer>
  );
}

export function CategoryExpenseDoughnut({
  data,
}: {
  data: Array<{ category_name: string; category_color: string; total: number }>;
}) {
  const theme = useRechartsTheme();

  return (
    <ResponsiveContainer width="100%" height="100%">
      <PieChart>
        <Pie
          data={data}
          dataKey="total"
          nameKey="category_name"
          cx="40%"
          cy="50%"
          innerRadius="56%"
          outerRadius="82%"
          paddingAngle={2}
        >
          {data.map((entry, idx) => (
            <Cell key={`cell-${idx}`} fill={entry.category_color || '#4F46E5'} />
          ))}
        </Pie>
        <Tooltip
          contentStyle={theme.tooltipStyle}
          formatter={(value) => formatMoney(Number(value), theme.symbol, theme.currency)}
        />
        <Legend
          layout="vertical"
          verticalAlign="middle"
          align="right"
          wrapperStyle={{ fontSize: '11px', maxWidth: '44%' }}
        />
      </PieChart>
    </ResponsiveContainer>
  );
}

export function SpendingTrendLineChart({
  data,
}: {
  data: Array<{ month: string; expense: number; savings?: number; net?: number }>;
}) {
  const theme = useRechartsTheme();
  const chartData = data.map((d) => ({
    month: d.month,
    expense: d.expense,
    savings: d.savings ?? d.net ?? 0,
    label: formatMonthLabel(d.month),
  }));

  return (
    <ResponsiveContainer width="100%" height="100%">
      <AreaChart data={chartData} margin={{ top: 8, right: 12, left: 4, bottom: 4 }}>
        <defs>
          <linearGradient id="spendGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#EF4444" stopOpacity={0.2} />
            <stop offset="95%" stopColor="#EF4444" stopOpacity={0} />
          </linearGradient>
          <linearGradient id="savingsGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#16A34A" stopOpacity={0.18} />
            <stop offset="95%" stopColor="#16A34A" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={theme.gridStroke} />
        <XAxis
          dataKey="label"
          tick={{ fill: theme.axisText, fontSize: 11 }}
          axisLine={false}
          tickLine={false}
        />
        <YAxis
          tick={{ fill: theme.axisText, fontSize: 11 }}
          axisLine={false}
          tickLine={false}
          tickFormatter={(v) => `${theme.symbol}${Number(v).toLocaleString('en-IN')}`}
        />
        <Tooltip
          contentStyle={theme.tooltipStyle}
          formatter={(value) => formatMoney(Number(value), theme.symbol, theme.currency)}
        />
        <Legend wrapperStyle={{ fontSize: '12px' }} />
        <Area
          type="monotone"
          dataKey="expense"
          name="Monthly Spending"
          stroke="#EF4444"
          strokeWidth={2}
          fill="url(#spendGradient)"
        />
        <Area
          type="monotone"
          dataKey="savings"
          name="Net Monthly Savings"
          stroke="#16A34A"
          strokeWidth={2}
          fill="url(#savingsGradient)"
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}

export function BudgetVsActualChart({
  data,
}: {
  data: Array<{ category_name: string; budgeted: number; actual: number }>;
}) {
  const theme = useRechartsTheme();

  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={data} margin={{ top: 8, right: 12, left: 4, bottom: 4 }}>
        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={theme.gridStroke} />
        <XAxis
          dataKey="category_name"
          tick={{ fill: theme.axisText, fontSize: 11 }}
          axisLine={false}
          tickLine={false}
        />
        <YAxis
          tick={{ fill: theme.axisText, fontSize: 11 }}
          axisLine={false}
          tickLine={false}
          tickFormatter={(v) => `${theme.symbol}${Number(v).toLocaleString('en-IN')}`}
        />
        <Tooltip
          contentStyle={theme.tooltipStyle}
          formatter={(value) => formatMoney(Number(value), theme.symbol, theme.currency)}
        />
        <Legend wrapperStyle={{ fontSize: '12px' }} />
        <Bar
          dataKey="budgeted"
          name="Budget Limit"
          fill={theme.isDark ? '#263247' : '#E5E7EB'}
          radius={[6, 6, 0, 0]}
          maxBarSize={28}
        />
        <Bar dataKey="actual" name="Actual Spent" radius={[6, 6, 0, 0]} maxBarSize={28}>
          {data.map((entry, idx) => {
            const pct = entry.budgeted > 0 ? (entry.actual / entry.budgeted) * 100 : 0;
            const barFill =
              pct > 100
                ? '#EF4444'
                : pct >= 80
                ? '#F59E0B'
                : theme.isDark
                ? '#818CF8'
                : '#4F46E5';
            return <Cell key={`bva-${idx}`} fill={barFill} />;
          })}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

export function SavingsProgressChart({
  data,
}: {
  data: Array<{ goal_name: string; current_amount: number; target_amount: number }>;
}) {
  const theme = useRechartsTheme();

  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart
        data={data}
        layout="vertical"
        margin={{ top: 8, right: 20, left: 20, bottom: 4 }}
      >
        <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke={theme.gridStroke} />
        <XAxis
          type="number"
          tick={{ fill: theme.axisText, fontSize: 11 }}
          axisLine={false}
          tickLine={false}
          tickFormatter={(v) => `${theme.symbol}${Number(v).toLocaleString('en-IN')}`}
        />
        <YAxis
          type="category"
          dataKey="goal_name"
          width={140}
          tick={{ fill: theme.axisText, fontSize: 11 }}
          axisLine={false}
          tickLine={false}
        />
        <Tooltip
          contentStyle={theme.tooltipStyle}
          formatter={(value) => formatMoney(Number(value), theme.symbol, theme.currency)}
        />
        <Legend wrapperStyle={{ fontSize: '12px' }} />
        <Bar dataKey="current_amount" name="Saved" fill="#16A34A" radius={[0, 6, 6, 0]} barSize={18} />
        <Bar
          dataKey="target_amount"
          name="Target"
          fill={theme.isDark ? '#263247' : '#E5E7EB'}
          radius={[0, 6, 6, 0]}
          barSize={18}
        />
      </BarChart>
    </ResponsiveContainer>
  );
}
