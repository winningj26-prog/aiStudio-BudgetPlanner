import * as XLSX from 'xlsx';
import {
  CategoryItem,
  ExpenseTransaction,
  IncomeTransaction,
  MonthSummary,
  SettingsState,
} from '../types/budget';
import { formatCurrency } from './formatters';

const safeAmount = (value: unknown): number => {
  const amount = Number(value);
  return Number.isFinite(amount) && amount >= 0 ? amount : 0;
};

export interface WorkbookExportData {
  settings: SettingsState;
  incomeCategories: CategoryItem[];
  expenseCategories: CategoryItem[];
  paymentMethods: string[];
  incomeTransactions: IncomeTransaction[];
  expenseTransactions: ExpenseTransaction[];
  plannedIncome: Record<string, number>;
  plannedExpenses: Record<string, number>;
  annualData: MonthSummary[];
}

/**
 * Generates an Excel workbook (.xlsx) with multiple formatted sheets:
 * 1. Executive Dashboard Summary
 * 2. Income Ledger
 * 3. Expense Ledger
 * 4. Monthly Budget vs Actuals
 * 5. Annual Summary
 * 6. Configuration & Categories
 */
export function generateExcelWorkbook(data: WorkbookExportData): Blob {
  const wb = XLSX.utils.book_new();

  const totalIncome = data.incomeTransactions.reduce((acc, t) => acc + safeAmount(t.amount), 0);
  const totalExpenses = data.expenseTransactions.reduce((acc, t) => acc + safeAmount(t.amount), 0);
  const netSavings = totalIncome - totalExpenses;
  const savingsRate = totalIncome > 0 ? (netSavings / totalIncome) * 100 : 0;
  const totalPlannedExpenses = Object.values(data.plannedExpenses).reduce((a, b) => a + safeAmount(b), 0);
  const remainingBudget = totalPlannedExpenses - totalExpenses;

  // ----------------------------------------------------
  // Sheet 1: Executive Dashboard Summary
  // ----------------------------------------------------
  const dashboardRows = [
    ['PERSONAL MONTHLY BUDGET PLANNER - EXECUTIVE SUMMARY'],
    ['Report Generated:', new Date().toLocaleString()],
    ['Active Period:', `${data.settings.month} ${data.settings.year}`],
    ['Base Currency:', data.settings.currency],
    ['Date Format:', data.settings.dateFormat],
    [],
    ['KEY PERFORMANCE INDICATORS (KPIs)', 'AMOUNT / VALUE', 'TARGET / BENCHMARK', 'STATUS'],
    ['Total Income', totalIncome, 'Monthly Inflow', totalIncome > 0 ? 'Active' : 'No Income'],
    ['Total Expenses', totalExpenses, `Budget Limit: ${totalPlannedExpenses}`, totalExpenses <= totalPlannedExpenses ? 'Under Budget' : 'Over Budget'],
    ['Net Cashflow / Savings', netSavings, 'Net Monthly Surplus', netSavings >= 0 ? 'Surplus' : 'Deficit'],
    ['Savings Rate (%)', `${savingsRate.toFixed(1)}%`, 'Target >= 20.0%', savingsRate >= 20 ? 'Optimal (>=20%)' : 'Below Target (<20%)'],
    ['Total Planned Expenses', totalPlannedExpenses, 'Allocated Limit', 'Budgeted'],
    ['Remaining Budget Buffer', remainingBudget, 'Planned - Actual', remainingBudget >= 0 ? 'Within Budget' : 'Over Budget'],
    [],
    ['EXPENSE BREAKDOWN BY CATEGORY', 'PLANNED', 'ACTUAL SPENT', 'VARIANCE', 'UTILIZATION %'],
  ];

  data.expenseCategories.forEach((cat) => {
    const planned = safeAmount(data.plannedExpenses[cat.name] ?? data.plannedExpenses[cat.id]);
    const actual = data.expenseTransactions
      .filter((t) => t.category.toLowerCase() === cat.name.toLowerCase())
      .reduce((acc, t) => acc + safeAmount(t.amount), 0);
    const variance = planned - actual;
    const util = planned > 0 ? ((actual / planned) * 100).toFixed(1) + '%' : 'N/A';
    dashboardRows.push([cat.name, planned as any, actual as any, variance as any, util]);
  });

  const wsDashboard = XLSX.utils.aoa_to_sheet(dashboardRows);
  wsDashboard['!cols'] = [
    { wch: 32 },
    { wch: 20 },
    { wch: 24 },
    { wch: 22 },
    { wch: 16 },
  ];
  XLSX.utils.book_append_sheet(wb, wsDashboard, 'Dashboard Summary');

  // ----------------------------------------------------
  // Sheet 2: Income Transactions
  // ----------------------------------------------------
  const incomeRows = [
    ['INCOME TRANSACTIONS LEDGER'],
    ['Active Month:', `${data.settings.month} ${data.settings.year}`],
    ['Total Records:', data.incomeTransactions.length],
    [],
    ['Record #', 'Date', 'Category', 'Description', `Amount (${data.settings.currency})`],
  ];

  data.incomeTransactions.forEach((t, idx) => {
    incomeRows.push([
      (idx + 1) as any,
      t.date,
      t.category,
      t.description || '',
      safeAmount(t.amount) as any,
    ]);
  });

  incomeRows.push([]);
  incomeRows.push(['', '', '', 'TOTAL INCOME:', totalIncome as any]);

  const wsIncome = XLSX.utils.aoa_to_sheet(incomeRows);
  wsIncome['!cols'] = [
    { wch: 10 },
    { wch: 15 },
    { wch: 25 },
    { wch: 35 },
    { wch: 18 },
  ];
  XLSX.utils.book_append_sheet(wb, wsIncome, 'Income Ledger');

  // ----------------------------------------------------
  // Sheet 3: Expense Transactions
  // ----------------------------------------------------
  const expenseRows = [
    ['EXPENSE TRANSACTIONS LEDGER'],
    ['Active Month:', `${data.settings.month} ${data.settings.year}`],
    ['Total Records:', data.expenseTransactions.length],
    [],
    ['Record #', 'Date', 'Category', 'Description', 'Payment Method', `Amount (${data.settings.currency})`],
  ];

  data.expenseTransactions.forEach((t, idx) => {
    expenseRows.push([
      (idx + 1) as any,
      t.date,
      t.category,
      t.description || '',
      t.paymentMethod || 'Other',
      safeAmount(t.amount) as any,
    ]);
  });

  expenseRows.push([]);
  expenseRows.push(['', '', '', '', 'TOTAL EXPENSES:', totalExpenses as any]);

  const wsExpenses = XLSX.utils.aoa_to_sheet(expenseRows);
  wsExpenses['!cols'] = [
    { wch: 10 },
    { wch: 15 },
    { wch: 24 },
    { wch: 35 },
    { wch: 20 },
    { wch: 18 },
  ];
  XLSX.utils.book_append_sheet(wb, wsExpenses, 'Expense Ledger');

  // ----------------------------------------------------
  // Sheet 4: Monthly Budget vs Actual
  // ----------------------------------------------------
  const budgetRows = [
    ['MONTHLY BUDGET VS ACTUAL VARIANCE ANALYSIS'],
    ['Period:', `${data.settings.month} ${data.settings.year}`],
    [],
    ['INCOME BUDGETING', 'PLANNED', 'ACTUAL', 'VARIANCE', 'STATUS'],
  ];

  data.incomeCategories.forEach((cat) => {
    const planned = safeAmount(data.plannedIncome[cat.name]);
    const actual = data.incomeTransactions
      .filter((t) => t.category.toLowerCase() === cat.name.toLowerCase())
      .reduce((acc, t) => acc + safeAmount(t.amount), 0);
    const variance = actual - planned;
    budgetRows.push([
      cat.name,
      planned as any,
      actual as any,
      variance as any,
      variance >= 0 ? 'On / Above Target' : 'Under Target',
    ]);
  });

  budgetRows.push([]);
  budgetRows.push(['EXPENSE BUDGETING', 'PLANNED LIMIT', 'ACTUAL SPENT', 'REMAINING BUFFER', 'STATUS']);

  data.expenseCategories.forEach((cat) => {
    const planned = safeAmount(data.plannedExpenses[cat.name] ?? data.plannedExpenses[cat.id]);
    const actual = data.expenseTransactions
      .filter((t) => t.category.toLowerCase() === cat.name.toLowerCase())
      .reduce((acc, t) => acc + safeAmount(t.amount), 0);
    const variance = planned - actual;
    budgetRows.push([
      cat.name,
      planned as any,
      actual as any,
      variance as any,
      variance >= 0 ? 'Under Budget' : 'Over Budget Limit',
    ]);
  });

  const wsBudget = XLSX.utils.aoa_to_sheet(budgetRows);
  wsBudget['!cols'] = [
    { wch: 28 },
    { wch: 18 },
    { wch: 18 },
    { wch: 18 },
    { wch: 22 },
  ];
  XLSX.utils.book_append_sheet(wb, wsBudget, 'Monthly Budget Plan');

  // ----------------------------------------------------
  // Sheet 5: Annual Summary
  // ----------------------------------------------------
  const annualRows = [
    ['ANNUAL CASHFLOW & SAVINGS SUMMARY'],
    ['Calendar Year:', data.settings.year],
    [],
    ['Month', 'Full Month', `Income (${data.settings.currency})`, `Expenses (${data.settings.currency})`, `Net Savings (${data.settings.currency})`, 'Savings Rate (%)'],
  ];

  data.annualData.forEach((m) => {
    const income = safeAmount(m.income);
    const expenses = safeAmount(m.expenses);
    const savings = income - expenses;
    const savingsRate = income > 0 ? (savings / income) * 100 : 0;
    annualRows.push([
      m.month,
      m.fullName,
      income as any,
      expenses as any,
      savings as any,
      `${savingsRate.toFixed(1)}%`,
    ]);
  });

  const totalAnnualIncome = data.annualData.reduce((acc, m) => acc + safeAmount(m.income), 0);
  const totalAnnualExpenses = data.annualData.reduce((acc, m) => acc + safeAmount(m.expenses), 0);
  const totalAnnualSavings = totalAnnualIncome - totalAnnualExpenses;
  const annualSavingsRate = totalAnnualIncome > 0 ? (totalAnnualSavings / totalAnnualIncome) * 100 : 0;

  annualRows.push([]);
  annualRows.push([
    'FULL YEAR',
    'Annual Totals',
    totalAnnualIncome as any,
    totalAnnualExpenses as any,
    totalAnnualSavings as any,
    `${annualSavingsRate.toFixed(1)}%`,
  ]);

  const wsAnnual = XLSX.utils.aoa_to_sheet(annualRows);
  wsAnnual['!cols'] = [
    { wch: 10 },
    { wch: 16 },
    { wch: 18 },
    { wch: 18 },
    { wch: 18 },
    { wch: 16 },
  ];
  XLSX.utils.book_append_sheet(wb, wsAnnual, 'Annual Summary');

  // ----------------------------------------------------
  // Sheet 6: Settings & Categories
  // ----------------------------------------------------
  const settingsRows = [
    ['WORKBOOK CONFIGURATION & SYSTEM PARAMETERS'],
    ['Setting Key', 'Configured Value'],
    ['Currency Code', data.settings.currency],
    ['Date Format', data.settings.dateFormat],
    ['Active Tracking Month', data.settings.month],
    ['Active Fiscal Year', data.settings.year],
    [],
    ['INCOME CATEGORIES (tbl_IncomeCategories)', 'STATUS', 'COLOR'],
  ];

  data.incomeCategories.forEach((cat) => {
    settingsRows.push([cat.name, cat.isActive ? 'Active' : 'Inactive', cat.color || '']);
  });

  settingsRows.push([]);
  settingsRows.push(['EXPENSE CATEGORIES (tbl_ExpenseCategories)', 'STATUS', 'COLOR']);
  data.expenseCategories.forEach((cat) => {
    settingsRows.push([cat.name, cat.isActive ? 'Active' : 'Inactive', cat.color || '']);
  });

  settingsRows.push([]);
  settingsRows.push(['PAYMENT METHODS (tbl_PaymentMethods)']);
  data.paymentMethods.forEach((method) => {
    settingsRows.push([method]);
  });

  const wsSettings = XLSX.utils.aoa_to_sheet(settingsRows);
  wsSettings['!cols'] = [
    { wch: 32 },
    { wch: 20 },
    { wch: 16 },
  ];
  XLSX.utils.book_append_sheet(wb, wsSettings, 'Settings & Categories');

  // Write workbook to binary buffer
  const excelBuffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
  return new Blob([excelBuffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
}

/**
 * Escapes a cell value for standard CSV compatibility (RFC 4180)
 */
function escapeCsv(value: any): string {
  if (value === null || value === undefined) return '';
  const str = String(value);
  if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

/**
 * Generates a comprehensive structured CSV file containing all workbook ledgers,
 * KPI summaries, budget variance tables, and system configurations.
 */
export function generateStructuredCSV(data: WorkbookExportData): Blob {
  const lines: string[] = [];

  const totalIncome = data.incomeTransactions.reduce((acc, t) => acc + safeAmount(t.amount), 0);
  const totalExpenses = data.expenseTransactions.reduce((acc, t) => acc + safeAmount(t.amount), 0);
  const netSavings = totalIncome - totalExpenses;
  const savingsRate = totalIncome > 0 ? (netSavings / totalIncome) * 100 : 0;
  const totalPlannedExpenses = Object.values(data.plannedExpenses).reduce((a, b) => a + safeAmount(b), 0);
  const remainingBudget = totalPlannedExpenses - totalExpenses;

  // Header & Metadata
  lines.push('=== PERSONAL MONTHLY BUDGET PLANNER - STRUCTURED WORKBOOK BACKUP ===');
  lines.push(`Export Timestamp,${escapeCsv(new Date().toISOString())}`);
  lines.push(`Active Period,${escapeCsv(`${data.settings.month} ${data.settings.year}`)}`);
  lines.push(`Base Currency,${escapeCsv(data.settings.currency)}`);
  lines.push(`Date Format,${escapeCsv(data.settings.dateFormat)}`);
  lines.push('');

  // 1. Dashboard KPIs
  lines.push('=== 1. EXECUTIVE DASHBOARD SUMMARY ===');
  lines.push('KPI Metric,Amount,Benchmark,Status');
  lines.push(`Total Income,${totalIncome},Monthly Inflow,Active`);
  lines.push(`Total Expenses,${totalExpenses},${totalPlannedExpenses},${totalExpenses <= totalPlannedExpenses ? 'Under Budget' : 'Over Budget'}`);
  lines.push(`Net Savings,${netSavings},Monthly Surplus,${netSavings >= 0 ? 'Surplus' : 'Deficit'}`);
  lines.push(`Savings Rate %,${savingsRate.toFixed(1)}%,Target >= 20.0%,${savingsRate >= 20 ? 'Target Met' : 'Below Target'}`);
  lines.push(`Total Planned Expenses,${totalPlannedExpenses},Budget Limit,Allocated`);
  lines.push(`Remaining Budget Buffer,${remainingBudget},Planned - Actual,${remainingBudget >= 0 ? 'Within Budget' : 'Over Budget'}`);
  lines.push('');

  // 2. Income Ledger
  lines.push('=== 2. INCOME TRANSACTIONS LEDGER ===');
  lines.push('Record #,Date,Category,Description,Amount');
  data.incomeTransactions.forEach((t, idx) => {
    lines.push(`${idx + 1},${escapeCsv(t.date)},${escapeCsv(t.category)},${escapeCsv(t.description || '')},${safeAmount(t.amount)}`);
  });
  lines.push(`,,,TOTAL INCOME,${totalIncome}`);
  lines.push('');

  // 3. Expense Ledger
  lines.push('=== 3. EXPENSE TRANSACTIONS LEDGER ===');
  lines.push('Record #,Date,Category,Description,Payment Method,Amount');
  data.expenseTransactions.forEach((t, idx) => {
    lines.push(`${idx + 1},${escapeCsv(t.date)},${escapeCsv(t.category)},${escapeCsv(t.description || '')},${escapeCsv(t.paymentMethod || 'Other')},${safeAmount(t.amount)}`);
  });
  lines.push(`,,,,TOTAL EXPENSES,${totalExpenses}`);
  lines.push('');

  // 4. Monthly Budget vs Actual
  lines.push('=== 4. MONTHLY BUDGET PLAN VS ACTUAL ===');
  lines.push('Type,Category,Planned,Actual,Variance,Status');
  data.incomeCategories.forEach((cat) => {
    const planned = safeAmount(data.plannedIncome[cat.id]);
    const actual = data.incomeTransactions
      .filter((t) => t.category.toLowerCase() === cat.name.toLowerCase())
      .reduce((acc, t) => acc + safeAmount(t.amount), 0);
    const variance = actual - planned;
    lines.push(`Income,${escapeCsv(cat.name)},${planned},${actual},${variance},${variance >= 0 ? 'On Target' : 'Under Target'}`);
  });
  data.expenseCategories.forEach((cat) => {
    const planned = safeAmount(data.plannedExpenses[cat.id]);
    const actual = data.expenseTransactions
      .filter((t) => t.category.toLowerCase() === cat.name.toLowerCase())
      .reduce((acc, t) => acc + safeAmount(t.amount), 0);
    const variance = planned - actual;
    lines.push(`Expense,${escapeCsv(cat.name)},${planned},${actual},${variance},${variance >= 0 ? 'Under Budget' : 'Over Budget'}`);
  });
  lines.push('');

  // 5. Annual Summary
  lines.push('=== 5. ANNUAL SUMMARY ===');
  lines.push('Month,Full Month,Income,Expenses,Net Savings,Savings Rate %');
  data.annualData.forEach((m) => {
    const income = safeAmount(m.income);
    const expenses = safeAmount(m.expenses);
    const savings = income - expenses;
    const savingsRate = income > 0 ? (savings / income) * 100 : 0;
    lines.push(`${escapeCsv(m.month)},${escapeCsv(m.fullName)},${income},${expenses},${savings},${savingsRate.toFixed(1)}%`);
  });
  lines.push('');

  // 6. Settings & Master Lists
  lines.push('=== 6. MASTER CATEGORIES & SETTINGS ===');
  lines.push('Type,Name,Status,Extra');
  lines.push(`Setting,Currency,${escapeCsv(data.settings.currency)},Base currency`);
  lines.push(`Setting,Active Month,${escapeCsv(data.settings.month)},Current month`);
  lines.push(`Setting,Active Year,${escapeCsv(String(data.settings.year))},Current fiscal year`);
  lines.push(`Setting,Date Format,${escapeCsv(data.settings.dateFormat)},Formatting rule`);
  data.incomeCategories.forEach((cat) => {
    lines.push(`Income Category,${escapeCsv(cat.name)},${cat.isActive ? 'Active' : 'Inactive'},${escapeCsv(cat.color || '')}`);
  });
  data.expenseCategories.forEach((cat) => {
    lines.push(`Expense Category,${escapeCsv(cat.name)},${cat.isActive ? 'Active' : 'Inactive'},${escapeCsv(cat.color || '')}`);
  });
  data.paymentMethods.forEach((method) => {
    lines.push(`Payment Method,${escapeCsv(method)},Active,Method`);
  });

  const csvContent = lines.join('\r\n');
  return new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
}

/**
 * Helper to trigger browser download of a Blob
 */
export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
