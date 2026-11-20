export function getCurrentMonth(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

export function getTodayIso(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(
    now.getDate()
  ).padStart(2, '0')}`;
}

export function formatMoney(
  amount: number,
  currencySymbol = '₹',
  currency = 'INR'
): string {
  const safe = Number.isFinite(amount) ? amount : 0;
  const locale = currency === 'INR' ? 'en-IN' : 'en-US';
  const absFormatted = Math.abs(safe).toLocaleString(locale, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  return `${safe < 0 ? '-' : ''}${currencySymbol}${absFormatted}`;
}

export function formatDate(dateStr: string, format = 'DD/MM/YYYY'): string {
  if (!dateStr || !/^\d{4}-\d{2}-\d{2}/.test(dateStr)) return dateStr || '-';
  const [y, m, d] = dateStr.slice(0, 10).split('-');
  if (format === 'MM/DD/YYYY') return `${m}/${d}/${y}`;
  if (format === 'YYYY-MM-DD') return `${y}-${m}-${d}`;
  return `${d}/${m}/${y}`;
}

export function formatMonthLabel(ym: string): string {
  if (!/^\d{4}-\d{2}$/.test(ym)) return ym;
  const [y, m] = ym.split('-').map(Number);
  const date = new Date(y, m - 1, 1);
  return date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
}

export function getRecentMonthOptions(count = 12): Array<{ value: string; label: string }> {
  const now = new Date();
  const options: Array<{ value: string; label: string }> = [];
  for (let i = -1; i < count; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const val = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    options.push({ value: val, label: formatMonthLabel(val) });
  }
  return options;
}
