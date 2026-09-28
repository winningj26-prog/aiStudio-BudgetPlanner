import { CurrencyCode } from '../types/budget';

export const CURRENCIES: Record<CurrencyCode, { symbol: string; label: string; rate: number }> = {
  USD: { symbol: '$', label: 'USD ($)', rate: 1 },
  EUR: { symbol: '€', label: 'EUR (€)', rate: 0.92 },
  GBP: { symbol: '£', label: 'GBP (£)', rate: 0.79 },
  CAD: { symbol: 'CA$', label: 'CAD ($)', rate: 1.36 },
  AUD: { symbol: 'AU$', label: 'AUD ($)', rate: 1.52 },
  JPY: { symbol: '¥', label: 'JPY (¥)', rate: 155 },
};

export const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

export const MONTH_SHORT_NAMES = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
];

export function formatCurrency(amount: number, currency: CurrencyCode = 'USD', decimals: number = 2): string {
  const config = CURRENCIES[currency] || CURRENCIES.USD;
  const isNegative = amount < 0;
  const absAmount = Math.abs(amount);
  
  const formattedNumber = absAmount.toLocaleString('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });

  if (isNegative) {
    return `-${config.symbol}${formattedNumber}`;
  }
  return `${config.symbol}${formattedNumber}`;
}

export function formatPercent(value: number, decimals: number = 1): string {
  return `${value.toFixed(decimals)}%`;
}

export function formatDate(dateStr: string, format: 'MM/DD/YYYY' | 'DD/MM/YYYY' | 'YYYY-MM-DD' = 'MM/DD/YYYY'): string {
  if (!dateStr) return '';
  const parts = dateStr.split('-');
  if (parts.length !== 3) return dateStr;
  const [year, month, day] = parts;

  switch (format) {
    case 'MM/DD/YYYY':
      return `${parseInt(month, 10)}/${parseInt(day, 10)}/${year}`;
    case 'DD/MM/YYYY':
      return `${parseInt(day, 10)}/${parseInt(month, 10)}/${year}`;
    case 'YYYY-MM-DD':
    default:
      return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
  }
}
