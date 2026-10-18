import { Currency, CurrencyConfig } from '../types/transaction';
export type { Currency, CurrencyConfig };

export const CURRENCIES: Record<Currency, CurrencyConfig> = {
  PHP: { code: 'PHP', symbol: '₱', name: 'Philippine Peso (₱)' },
  USD: { code: 'USD', symbol: '$', name: 'US Dollar ($)' },
  EUR: { code: 'EUR', symbol: '€', name: 'Euro (€)' },
  GBP: { code: 'GBP', symbol: '£', name: 'British Pound (£)' },
  CAD: { code: 'CAD', symbol: 'CA$', name: 'Canadian Dollar (CA$)' },
  AUD: { code: 'AUD', symbol: 'A$', name: 'Australian Dollar (A$)' },
  SGD: { code: 'SGD', symbol: 'S$', name: 'Singapore Dollar (S$)' },
};

export function formatCurrency(amount: number, currency: Currency = 'PHP'): string {
  const symbol = CURRENCIES[currency]?.symbol || '₱';
  const cleanAmount = isNaN(amount) ? 0 : amount;
  const isNegative = cleanAmount < -0.001;
  const formattedNumber = Math.abs(cleanAmount).toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  return `${isNegative ? '-' : ''}${symbol}${formattedNumber}`;
}

/**
 * PDF-safe currency formatter: Avoids UTF-8 non-ASCII characters like '₱' (U+20B1)
 * which jsPDF renders as '±' (+/-) in standard WinAnsi Helvetica encoding.
 */
export function formatCurrencyPdf(amount: number, currency: Currency = 'PHP'): string {
  let prefix = 'PHP ';
  if (currency === 'USD') prefix = '$';
  else if (currency === 'EUR') prefix = 'EUR ';
  else if (currency === 'GBP') prefix = 'GBP ';
  else if (currency === 'CAD') prefix = 'CAD ';
  else if (currency === 'AUD') prefix = 'AUD ';
  else if (currency === 'SGD') prefix = 'SGD ';

  const cleanAmount = isNaN(amount) ? 0 : amount;
  const isNegative = cleanAmount < -0.001;
  const formattedNumber = Math.abs(cleanAmount).toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

  return `${isNegative ? '-' : ''}${prefix}${formattedNumber}`;
}

export function formatDate(dateString: string): string {
  if (!dateString) return '-';
  try {
    const [year, month, day] = dateString.split('-').map(Number);
    if (!year || !month || !day) return dateString;
    const date = new Date(year, month - 1, day);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  } catch {
    return dateString;
  }
}

/**
 * Get ISO week number and year representation
 */
export function getWeekDetails(dateString: string) {
  const [year, month, day] = dateString.split('-').map(Number);
  const date = new Date(year, month - 1, day);
  
  // Thursday in current week decides the year.
  date.setDate(date.getDate() + 3 - ((date.getDay() + 6) % 7));
  const week1 = new Date(date.getFullYear(), 0, 4);
  const weekNumber = 1 + Math.round(((date.getTime() - week1.getTime()) / 86400000 - 3 + ((week1.getDay() + 6) % 7)) / 7);
  
  // Calculate start of this week (Monday) and end of this week (Sunday)
  const d = new Date(year, month - 1, day);
  const dayOfWeek = d.getDay();
  const diffToMonday = d.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1);
  const monday = new Date(d.setDate(diffToMonday));
  const sunday = new Date(new Date(monday).setDate(monday.getDate() + 6));

  const formatShort = (dt: Date) => dt.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  
  const weekKey = `${monday.getFullYear()}-W${String(weekNumber).padStart(2, '0')}`;
  const weekLabel = `Week ${weekNumber} (${formatShort(monday)} – ${formatShort(sunday)}, ${monday.getFullYear()})`;
  
  return {
    weekKey,
    weekNumber,
    year: monday.getFullYear(),
    startDate: monday.toISOString().split('T')[0],
    endDate: sunday.toISOString().split('T')[0],
    label: weekLabel,
  };
}

export function getMonthDetails(dateString: string) {
  const [year, month] = dateString.split('-').map(Number);
  const date = new Date(year, month - 1, 1);
  const monthKey = `${year}-${String(month).padStart(2, '0')}`;
  const label = date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  return {
    monthKey,
    year,
    month,
    label,
  };
}
