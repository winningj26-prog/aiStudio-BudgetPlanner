/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  CategoryItem,
  ExpenseTransaction,
  IncomeTransaction,
  SettingsState,
} from '../types/budget';

export interface GoogleSheetConfig {
  spreadsheetId: string;
  spreadsheetTitle: string;
  spreadsheetUrl: string;
  autoSync: boolean;
  lastSyncedAt: string | null;
}

export interface SyncPayload {
  settings: SettingsState;
  incomeCategories: CategoryItem[];
  expenseCategories: CategoryItem[];
  paymentMethods: string[];
  incomeTransactions: IncomeTransaction[];
  expenseTransactions: ExpenseTransaction[];
  plannedIncome: Record<string, number>;
  plannedExpenses: Record<string, number>;
}

function parseSheetAmount(value: unknown, context: string): number {
  const raw = String(value ?? '').trim();
  if (!raw) throw new Error(`Invalid amount in ${context}: value is empty`);
  const normalized = raw.replace(/[^0-9.-]/g, '');
  const amount = Number(normalized);
  if (!Number.isFinite(amount)) throw new Error(`Invalid amount in ${context}: "${raw}"`);
  return amount;
}

function parseSheetDate(value: unknown, context: string): string {
  const raw = String(value ?? '').trim();
  let year: number;
  let month: number;
  let day: number;

  const iso = raw.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  const slash = raw.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/);

  if (iso) {
    year = Number(iso[1]);
    month = Number(iso[2]);
    day = Number(iso[3]);
  } else if (slash) {
    const first = Number(slash[1]);
    const second = Number(slash[2]);
    year = Number(slash[3]);
    // Prefer the app's default MM/DD interpretation when both are <= 12;
    // otherwise the unambiguous component is treated as the day.
    if (first > 12 && second <= 12) {
      day = first;
      month = second;
    } else {
      month = first;
      day = second;
    }
  } else {
    throw new Error(`Invalid date in ${context}: "${raw}". Expected YYYY-MM-DD or a standard slash date.`);
  }

  const candidate = new Date(Date.UTC(year, month - 1, day));
  if (
    !Number.isFinite(candidate.getTime()) ||
    candidate.getUTCFullYear() !== year ||
    candidate.getUTCMonth() !== month - 1 ||
    candidate.getUTCDate() !== day
  ) {
    throw new Error(`Invalid date in ${context}: "${raw}".`);
  }

  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

export interface PulledData {
  settings?: Partial<SettingsState>;
  incomeCategories?: CategoryItem[];
  expenseCategories?: CategoryItem[];
  paymentMethods?: string[];
  incomeTransactions?: IncomeTransaction[];
  expenseTransactions?: ExpenseTransaction[];
  plannedIncome?: Record<string, number>;
  plannedExpenses?: Record<string, number>;
}

/**
 * Extracts a Google Spreadsheet ID from either a full URL or a raw ID string.
 */
export function extractSpreadsheetId(input: string): string {
  const trimmed = input.trim();
  const match = trimmed.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
  if (match && match[1]) {
    return match[1];
  }
  return trimmed;
}

/**
 * Verify access to a spreadsheet and retrieve its tab names.
 */
export async function verifySpreadsheet(
  accessToken: string,
  spreadsheetId: string
): Promise<{ exists: boolean; title: string; sheets: string[] }> {
  const res = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}?fields=properties.title,sheets.properties.title`,
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    }
  );

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    const message = errorData.error?.message || `Google Sheets API returned status ${res.status}`;
    throw new Error(message);
  }

  const data = await res.json();
  const title = data.properties?.title || 'Personal Budget Spreadsheet';
  const sheets = (data.sheets || []).map((s: any) => s.properties?.title as string);

  return { exists: true, title, sheets };
}

/**
 * Ensure standard budget tabs exist in the target spreadsheet.
 */
async function ensureStandardSheets(
  accessToken: string,
  spreadsheetId: string,
  existingSheets: string[]
): Promise<void> {
  const required = ['tbl_Settings', 'tbl_Income', 'tbl_Expenses', 'tbl_MonthlyBudget', 'tbl_Categories'];
  const missing = required.filter((r) => !existingSheets.includes(r));

  if (missing.length === 0) return;

  const requests = missing.map((title) => ({
    addSheet: {
      properties: {
        title,
        gridProperties: {
          rowCount: 500,
          columnCount: 15,
        },
      },
    },
  }));

  const res = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}:batchUpdate`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ requests }),
    }
  );

  if (!res.ok) {
    console.warn('Could not auto-add missing sheet tabs, continuing with existing structure');
  }
}

/**
 * Creates a brand new Google Spreadsheet in the user's Google Drive configured for this app.
 */
export async function createBudgetSpreadsheet(
  accessToken: string,
  title = 'Personal Monthly Budget Planner'
): Promise<{ spreadsheetId: string; spreadsheetUrl: string; title: string }> {
  const body = {
    properties: {
      title,
    },
    sheets: [
      { properties: { title: 'tbl_Settings' } },
      { properties: { title: 'tbl_Income' } },
      { properties: { title: 'tbl_Expenses' } },
      { properties: { title: 'tbl_MonthlyBudget' } },
      { properties: { title: 'tbl_Categories' } },
    ],
  };

  const res = await fetch('https://sheets.googleapis.com/v4/spreadsheets', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.error?.message || 'Failed to create spreadsheet in Google Drive');
  }

  const data = await res.json();
  const spreadsheetId = data.spreadsheetId;
  const spreadsheetUrl = data.spreadsheetUrl || `https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit`;

  return {
    spreadsheetId,
    spreadsheetUrl,
    title,
  };
}

/**
 * Pushes the full application budget workbook to Google Sheets.
 */
export async function pushAllDataToGoogleSheet(
  accessToken: string,
  spreadsheetId: string,
  payload: SyncPayload
): Promise<void> {
  // 1. Verify and ensure standard tabs exist
  try {
    const check = await verifySpreadsheet(accessToken, spreadsheetId);
    await ensureStandardSheets(accessToken, spreadsheetId, check.sheets);
  } catch (err) {
    console.warn('Tab verification warning:', err);
  }

  // 2. Prepare tabular data for each worksheet
  const settingsRows = [
    ['Setting Key', 'Configured Value'],
    ['Currency', payload.settings.currency],
    ['Month', payload.settings.month],
    ['Year', String(payload.settings.year)],
    ['DateFormat', payload.settings.dateFormat],
    ['LastSync', new Date().toISOString()],
  ];

  const incomeRows = [
    ['Transaction ID', 'Date', 'Category', 'Description', 'Amount'],
    ...payload.incomeTransactions.map((tx) => [
      tx.id,
      tx.date,
      tx.category,
      tx.description,
      tx.amount,
    ]),
  ];

  const expenseRows = [
    ['Transaction ID', 'Date', 'Category', 'Description', 'Amount', 'Payment Method'],
    ...payload.expenseTransactions.map((tx) => [
      tx.id,
      tx.date,
      tx.category,
      tx.description,
      tx.amount,
      tx.paymentMethod || '',
    ]),
  ];

  const budgetRows = [
    ['Type', 'Category', 'Planned Budget'],
    ...Object.entries(payload.plannedIncome).map(([cat, amt]) => ['Income', cat, amt]),
    ...Object.entries(payload.plannedExpenses).map(([cat, amt]) => ['Expense', cat, amt]),
  ];

  const categoriesRows = [
    ['Type', 'ID', 'Name', 'Active', 'Color'],
    ...payload.incomeCategories.map((c) => ['Income', c.id, c.name, c.isActive ? 'TRUE' : 'FALSE', c.color || '']),
    ...payload.expenseCategories.map((c) => ['Expense', c.id, c.name, c.isActive ? 'TRUE' : 'FALSE', c.color || '']),
    ...payload.paymentMethods.map((m, idx) => ['PaymentMethod', `pm_${idx}`, m, 'TRUE', '']),
  ];

  // 3. Clear existing ranges to avoid orphaned old rows
  const clearRes = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values:batchClear`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        ranges: [
          'tbl_Settings!A1:Z50',
          'tbl_Income!A1:Z1000',
          'tbl_Expenses!A1:Z1000',
          'tbl_MonthlyBudget!A1:Z200',
          'tbl_Categories!A1:Z200',
        ],
      }),
    }
  );

  if (!clearRes.ok) {
    console.warn('Clear existing ranges warning, proceeding with batchUpdate');
  }

  // 4. Batch update with USER_ENTERED formatting
  const updateRes = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values:batchUpdate`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        valueInputOption: 'USER_ENTERED',
        data: [
          { range: 'tbl_Settings!A1', values: settingsRows },
          { range: 'tbl_Income!A1', values: incomeRows },
          { range: 'tbl_Expenses!A1', values: expenseRows },
          { range: 'tbl_MonthlyBudget!A1', values: budgetRows },
          { range: 'tbl_Categories!A1', values: categoriesRows },
        ],
      }),
    }
  );

  if (!updateRes.ok) {
    const errorData = await updateRes.json().catch(() => ({}));
    throw new Error(errorData.error?.message || 'Failed to update Google Spreadsheet rows');
  }
}

/**
 * Pulls budget data from the connected Google Sheet into the application.
 */
export async function pullAllDataFromGoogleSheet(
  accessToken: string,
  spreadsheetId: string
): Promise<PulledData> {
  const ranges = [
    'tbl_Settings!A1:B10',
    'tbl_Income!A1:E1000',
    'tbl_Expenses!A1:F1000',
    'tbl_MonthlyBudget!A1:C200',
    'tbl_Categories!A1:E200',
  ];

  const query = ranges.map((r) => `ranges=${encodeURIComponent(r)}`).join('&');
  const res = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values:batchGet?${query}`,
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    }
  );

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.error?.message || 'Failed to read data from Google Spreadsheet');
  }

  const data = await res.json();
  const valueRanges = data.valueRanges || [];

  const result: PulledData = {};

  // 1. Parse Settings
  const settingsRange = valueRanges.find((vr: any) => vr.range.includes('tbl_Settings'));
  if (settingsRange?.values?.length > 1) {
    const parsedSettings: Partial<SettingsState> = {};
    for (let i = 1; i < settingsRange.values.length; i++) {
      const [key, val] = settingsRange.values[i];
      if (!key || !val) continue;
      if (key === 'Currency') parsedSettings.currency = val as any;
      if (key === 'Month') parsedSettings.month = val;
      if (key === 'Year') parsedSettings.year = parseInt(val, 10) || 2026;
      if (key === 'DateFormat') parsedSettings.dateFormat = val as any;
    }
    result.settings = parsedSettings;
  }

  // 2. Parse Income Transactions
  const incomeRange = valueRanges.find((vr: any) => vr.range.includes('tbl_Income'));
  if (incomeRange?.values?.length > 1) {
    const transactions: IncomeTransaction[] = [];
    for (let i = 1; i < incomeRange.values.length; i++) {
      const row = incomeRange.values[i];
      if (!row || row.length < 5) continue;
      const [id, date, category, description, amountStr] = row;
      const amount = parseSheetAmount(amountStr, `tbl_Income row ${i + 1}`);
      transactions.push({
        id: id || `inc_tx_${Date.now()}_${i}`,
        date: parseSheetDate(date, `tbl_Income row ${i + 1}`),
        category: String(category || '').trim(),
        description: String(description || '').trim(),
        amount,
      });
    }
    result.incomeTransactions = transactions;
  }

  // 3. Parse Expense Transactions
  const expenseRange = valueRanges.find((vr: any) => vr.range.includes('tbl_Expenses'));
  if (expenseRange?.values?.length > 1) {
    const transactions: ExpenseTransaction[] = [];
    for (let i = 1; i < expenseRange.values.length; i++) {
      const row = expenseRange.values[i];
      if (!row || row.length < 5) continue;
      const [id, date, category, description, amountStr, paymentMethod] = row;
      const amount = parseSheetAmount(amountStr, `tbl_Expenses row ${i + 1}`);
      transactions.push({
        id: id || `exp_tx_${Date.now()}_${i}`,
        date: parseSheetDate(date, `tbl_Expenses row ${i + 1}`),
        category: String(category || '').trim(),
        description: String(description || '').trim(),
        amount,
        paymentMethod: String(paymentMethod || '').trim(),
      });
    }
    result.expenseTransactions = transactions;
  }

  // 4. Parse Monthly Planned Budget
  const budgetRange = valueRanges.find((vr: any) => vr.range.includes('tbl_MonthlyBudget'));
  if (budgetRange?.values?.length > 1) {
    const plannedInc: Record<string, number> = {};
    const plannedExp: Record<string, number> = {};
    for (let i = 1; i < budgetRange.values.length; i++) {
      const row = budgetRange.values[i];
      if (!row || row.length < 3) continue;
      const [type, category, amountStr] = row;
      const amount = parseSheetAmount(amountStr, `tbl_MonthlyBudget row ${i + 1}`);
      if (type === 'Income') {
        plannedInc[category] = amount;
      } else if (type === 'Expense') {
        plannedExp[category] = amount;
      }
    }
    result.plannedIncome = plannedInc;
    result.plannedExpenses = plannedExp;
  }

  // 5. Parse Categories
  const catRange = valueRanges.find((vr: any) => vr.range.includes('tbl_Categories'));
  if (catRange?.values?.length > 1) {
    const incCats: CategoryItem[] = [];
    const expCats: CategoryItem[] = [];
    const pMethods: string[] = [];

    for (let i = 1; i < catRange.values.length; i++) {
      const row = catRange.values[i];
      if (!row || row.length < 3) continue;
      const [type, id, name, activeStr, color] = row;
      const isActive = String(activeStr).toUpperCase() !== 'FALSE';

      if (type === 'Income') {
        incCats.push({
          id: id || `inc_${Date.now()}_${i}`,
          name,
          isActive,
          color: color || '#0d9488',
        });
      } else if (type === 'Expense') {
        expCats.push({
          id: id || `exp_${Date.now()}_${i}`,
          name,
          isActive,
          color: color || '#3b82f6',
        });
      } else if (type === 'PaymentMethod') {
        pMethods.push(name);
      }
    }

    if (incCats.length > 0) result.incomeCategories = incCats;
    if (expCats.length > 0) result.expenseCategories = expCats;
    if (pMethods.length > 0) result.paymentMethods = pMethods;
  }

  return result;
}
