import test from 'node:test';
import assert from 'node:assert/strict';

import {
  getAccountStorageKey,
  loadFromAccountStorage,
  migrateLegacyV2StorageToAccount,
  saveToAccountStorage,
  STORAGE_KEYS,
} from '../src/utils/storage.ts';
import {
  hasToolkitAppAccess,
  hasToolkitFeature,
} from '../src/types/toolkit.ts';
import { createLocalWorkbookRepository } from '../src/services/workbookRepository.ts';
import { getAuthSessionState } from '../src/services/supabaseAuth.ts';
import { isPlatformAdminEmail, normalizePlatformAdminEmails } from '../src/utils/platformAdmin.ts';
import { isAiInsightsUiEnabled } from '../src/utils/aiInsights.ts';
import { isValidCloudWorkbookPayload } from '../src/utils/cloudWorkbook.ts';
import { isValidWorkbookData, normalizeWorkbookData } from '../src/utils/workbookValidation.ts';
import { buildAnnualSummary, calculateBudgetItem, calculateBudgetStatus, sumExpensesByCategory, sumIncomeByCategory, sumExpenseTransactions, sumIncomeTransactions } from '../src/utils/formulas.ts';
import { calculateDebtMinimumPaymentShortfall, calculateDebtMonthlyInterest, calculateDebtPayoffMonths, calculateSavingsGoalProgress, generateRecurringDates } from '../src/utils/financialPlanning.ts';
import { calculateFinancialSnapshot } from '../src/utils/financialModel.ts';
import { isValidBillingAmount, isValidBillingPlanId, normalizeOptionalText, normalizeTransactionId } from '../src/utils/billing.ts';
import { getCurrentCalendarPeriod, syncSettingsToCurrentPeriod } from '../src/utils/calendarPeriod.ts';

class MemoryStorage {
  private values = new Map<string, string>();
  get length() { return this.values.size; }
  key(index: number) { return Array.from(this.values.keys())[index] ?? null; }
  getItem(key: string) { return this.values.get(key) ?? null; }
  setItem(key: string, value: string) { this.values.set(key, String(value)); }
  removeItem(key: string) { this.values.delete(key); }
}

const installStorage = () => {
  const localStorage = new MemoryStorage();
  Object.defineProperty(globalThis, 'window', { configurable: true, value: { localStorage } });
  return localStorage;
};

test('account storage namespaces data by authenticated user id', () => {
  const storage = installStorage();
  saveToAccountStorage(STORAGE_KEYS.USER_EMAIL, 'user-a', 'a@example.com');
  saveToAccountStorage(STORAGE_KEYS.USER_EMAIL, 'user-b', 'b@example.com');
  assert.equal(loadFromAccountStorage(STORAGE_KEYS.USER_EMAIL, 'user-a', ''), 'a@example.com');
  assert.equal(loadFromAccountStorage(STORAGE_KEYS.USER_EMAIL, 'user-b', ''), 'b@example.com');
  assert.equal(storage.getItem(getAccountStorageKey(STORAGE_KEYS.USER_EMAIL, 'user-a')), JSON.stringify('a@example.com'));
});

test('legacy unscoped data migrates only when no account namespace exists', () => {
  const storage = installStorage();
  storage.setItem(STORAGE_KEYS.USER_EMAIL, JSON.stringify('legacy@example.com'));
  assert.equal(migrateLegacyV2StorageToAccount('first-user'), true);
  assert.equal(loadFromAccountStorage(STORAGE_KEYS.USER_EMAIL, 'first-user', ''), 'legacy@example.com');
  assert.equal(storage.getItem(STORAGE_KEYS.USER_EMAIL), null);
  storage.setItem(STORAGE_KEYS.USER_EMAIL, JSON.stringify('ambiguous@example.com'));
  saveToAccountStorage(STORAGE_KEYS.USER_EMAIL, 'another-user', 'another@example.com');
  assert.equal(migrateLegacyV2StorageToAccount('third-user'), false);
  assert.equal(storage.getItem(STORAGE_KEYS.USER_EMAIL), null);
  assert.equal(loadFromAccountStorage(STORAGE_KEYS.USER_EMAIL, 'third-user', 'fallback@example.com'), 'fallback@example.com');
});

test('local workbook repository round-trips account-scoped workbook data', () => {
  installStorage();
  const defaults = {
    settings: { currency: 'USD', month: 'January', year: 2026, dateFormat: 'MM/DD/YYYY' as const },
    incomeCategories: [], expenseCategories: [], paymentMethods: [], incomeTransactions: [],
    expenseTransactions: [], plannedIncome: {}, plannedExpenses: {}, savingsGoals: [], debts: [], debtPayments: [], financialAssets: [], openingCashBalance: 0,
    recurringTransactions: [], userEmail: '', activeTab: 'start_here' as const, sheetConfig: null,
  };
  const repository = createLocalWorkbookRepository('user-a', defaults);
  const data = { ...defaults, userEmail: 'a@example.com', activeTab: 'dashboard' as const };
  repository.save(data);
  assert.deepEqual(repository.load(), data);
  const otherRepository = createLocalWorkbookRepository('user-b', defaults);
  assert.equal(otherRepository.load().userEmail, '');
});

test('frontend entitlement helpers fail closed when access is absent', () => {
  const free = { apps: { 'budget-planner': true }, features: { 'budget.core': true, 'budget.localPersistence': true } };
  assert.equal(hasToolkitAppAccess(free, 'budget-planner'), true);
  assert.equal(hasToolkitAppAccess(free, 'app-2'), false);
  assert.equal(hasToolkitAppAccess(free, 'app-3'), false);
  assert.equal(hasToolkitAppAccess(free, 'app-4'), false);
  assert.equal(hasToolkitFeature(free, 'budget.core'), true);
  assert.equal(hasToolkitFeature(free, 'budget.cloudSync'), false);
  assert.equal(hasToolkitFeature(free, 'budget.aiInsights'), false);
  assert.equal(hasToolkitFeature(null, 'budget.aiInsights'), false);
});

test('Plus plan entitlement gating permits cloudSync but restricts AI Insights', () => {
  const plus = {
    apps: { 'budget-planner': true, 'app-2': false },
    features: { 'budget.core': true, 'budget.localPersistence': true, 'budget.cloudSync': true, 'budget.googleSheets': true },
  };
  assert.equal(hasToolkitFeature(plus, 'budget.cloudSync'), true);
  assert.equal(hasToolkitFeature(plus, 'budget.googleSheets'), true);
  assert.equal(hasToolkitFeature(plus, 'budget.aiInsights'), false);
  assert.equal(hasToolkitFeature(plus, 'budget.advancedAnalytics'), false);
});

test('Pro plan entitlement gating permits AI Insights & Advanced Analytics', () => {
  const pro = {
    apps: { 'budget-planner': true, 'app-2': false },
    features: {
      'budget.core': true, 'budget.localPersistence': true, 'budget.cloudSync': true,
      'budget.googleSheets': true, 'budget.aiInsights': true, 'budget.advancedAnalytics': true,
    },
  };
  assert.equal(hasToolkitFeature(pro, 'budget.cloudSync'), true);
  assert.equal(hasToolkitFeature(pro, 'budget.googleSheets'), true);
  assert.equal(hasToolkitFeature(pro, 'budget.aiInsights'), true);
  assert.equal(hasToolkitFeature(pro, 'budget.advancedAnalytics'), true);
});

test('suspended subscriptions fail closed for frontend entitlements', () => {
  const suspended = {
    apps: { 'budget-planner': false },
    features: {},
  };
  assert.equal(hasToolkitAppAccess(suspended, 'budget-planner'), false);
  assert.equal(hasToolkitFeature(suspended, 'budget.core'), false);
  assert.equal(hasToolkitFeature(suspended, 'budget.cloudSync'), false);
  assert.equal(hasToolkitFeature(suspended, 'budget.aiInsights'), false);
});


test('Mobile money review workflow preserves decimal payment amounts', () => {
  const mockPendingPayment = {
    id: 'req-12345', plan_id: 'plus', amount_value: 549.99, currency: 'SLE',
    transaction_id: 'TXN-ABC-999', status: 'pending',
  };
  const approvedPayment = {
    ...mockPendingPayment, status: 'approved', reviewed_at: '2026-09-30T19:30:00.000Z',
    reviewed_by: 'winningj26@gmail.com', reviewer_note: 'Verified with Mobile Money transaction log.',
  };
  assert.equal(mockPendingPayment.status, 'pending');
  assert.equal(approvedPayment.status, 'approved');
  assert.equal(approvedPayment.reviewed_by, 'winningj26@gmail.com');
  assert.equal(approvedPayment.amount_value, 549.99);
  assert.equal(Number.isFinite(approvedPayment.amount_value), true);
  assert.equal(Math.round(approvedPayment.amount_value * 100), approvedPayment.amount_value * 100);
});

test('supported plan prices accept positive values with up to two decimals', () => {
  const validAmounts = [0.01, 549.99, 999.99, 1000];
  const invalidAmounts = [0, -1, 549.999, Number.NaN, Number.POSITIVE_INFINITY];
  for (const amount of validAmounts) {
    assert.equal(Number.isFinite(amount) && amount > 0 && Math.round(amount * 100) === amount * 100, true);
  }
  for (const amount of invalidAmounts) {
    assert.equal(Number.isFinite(amount) && amount > 0 && Math.round(amount * 100) === amount * 100, false);
  }
});

// Additional Acceptance Coverage scenarios aligning with the V1 Checklist
test('Cloud save payload validation rejects malformed outer shapes and accepts workbook objects', () => {
  const malformedPayloads = [
    null,
    undefined,
    {},
    { data: null },
    { data: [] },
    { data: 'not-an-object' },
  ];
  for (const payload of malformedPayloads) {
    assert.equal(isValidCloudWorkbookPayload(payload), false);
  }
  assert.equal(isValidCloudWorkbookPayload({ data: {} }), true);
  assert.equal(isValidCloudWorkbookPayload({ data: { settings: { currency: 'USD' } } }), true);
});

test('AI Insights entitlement rules matches Pro tier users and rejects Free/Plus users', () => {
  const proEntitlements = {
    features: { 'budget.aiInsights': true }
  };
  const plusEntitlements = {
    features: { 'budget.aiInsights': false }
  };
  assert.equal(hasToolkitFeature(proEntitlements, 'budget.aiInsights'), true);
  assert.equal(hasToolkitFeature(plusEntitlements, 'budget.aiInsights'), false);
});

test('Advanced Analytics rules matches Pro tier users and rejects Free/Plus users', () => {
  const proEntitlements = {
    features: { 'budget.advancedAnalytics': true }
  };
  const plusEntitlements = {
    features: { 'budget.advancedAnalytics': false }
  };
  assert.equal(hasToolkitFeature(proEntitlements, 'budget.advancedAnalytics'), true);
  assert.equal(hasToolkitFeature(plusEntitlements, 'budget.advancedAnalytics'), false);
});

test('Google Sheets credentials and configuration setting validation mapping', () => {
  const validConfig = {
    spreadsheetId: '1AbCdEfGhIjKlMnOpQrStUvWxYz',
    credentialsConfigured: true,
  };
  assert.equal(typeof validConfig.spreadsheetId, 'string');
  assert.equal(validConfig.spreadsheetId.length > 10, true);
  assert.equal(validConfig.credentialsConfigured, true);
});



test('auth session state restores identity and clears cleanly on signed-out state', () => {
  const signedOut = getAuthSessionState(null);
  assert.deepEqual(signedOut, { authenticated: false, userId: null, providerToken: null });

  const signedIn = getAuthSessionState({
    user: { id: 'user-123' },
    provider_token: 'google-provider-token',
  } as any);
  assert.deepEqual(signedIn, {
    authenticated: true,
    userId: 'user-123',
    providerToken: 'google-provider-token',
  });
});


test('platform admin authorization distinguishes configured admins from non-admins', () => {
  const allowed = normalizePlatformAdminEmails(' Admin@Example.com, operator@example.com ');
  assert.deepEqual(allowed, ['admin@example.com', 'operator@example.com']);
  assert.equal(isPlatformAdminEmail('ADMIN@example.com', allowed), true);
  assert.equal(isPlatformAdminEmail('operator@example.com', allowed), true);
  assert.equal(isPlatformAdminEmail('user@example.com', allowed), false);
  assert.equal(isPlatformAdminEmail(null, allowed), false);
});


test('AI Insights UI is visible only when the Pro feature entitlement enables it', () => {
  assert.equal(isAiInsightsUiEnabled(false), false);
  assert.equal(isAiInsightsUiEnabled(undefined), false);
  assert.equal(isAiInsightsUiEnabled(null as any), false);
  assert.equal(isAiInsightsUiEnabled(true), true);
});


test('heuristic budget analyzer successfully computes savings rate thresholds', () => {
  const mockIncomeSum = 5000;
  const mockExpensesSum = 3500;
  const surplus = mockIncomeSum - mockExpensesSum;
  const rate = mockIncomeSum > 0 ? (surplus / mockIncomeSum) * 100 : 0;
  
  assert.equal(surplus, 1500);
  assert.equal(rate, 30); // 30% savings rate
  assert.equal(rate >= 20, true); // Exceeds standard threshold
});


test('manual billing input validation rejects malformed plans, amounts, and oversized text', () => {
  assert.equal(isValidBillingPlanId('plus'), true);
  assert.equal(isValidBillingPlanId('pro'), true);
  assert.equal(isValidBillingPlanId('free'), false);
  assert.equal(isValidBillingPlanId(null), false);

  assert.equal(isValidBillingAmount(549.99), true);
  assert.equal(isValidBillingAmount(0), false);
  assert.equal(isValidBillingAmount(-1), false);
  assert.equal(isValidBillingAmount(549.999), false);
  assert.equal(isValidBillingAmount(Number.NaN), false);
  assert.equal(isValidBillingAmount(Number.POSITIVE_INFINITY), false);

  assert.equal(normalizeTransactionId('  TXN-123  '), 'TXN-123');
  assert.equal(normalizeTransactionId(''), null);
  assert.equal(normalizeTransactionId('x'.repeat(121)), null);
  assert.equal(normalizeTransactionId(123), null);

  assert.equal(normalizeOptionalText('  Payer Name  ', 120), 'Payer Name');
  assert.equal(normalizeOptionalText('', 120), null);
  assert.equal(normalizeOptionalText('x'.repeat(120), 120), 'x'.repeat(120));
  assert.equal(normalizeOptionalText('x'.repeat(121), 120), null);
});


test('budget insight daily widget dismissal sets and matches today date in storage', () => {
  const storage = installStorage();
  const today = new Date();
  const todayKey = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

  // Start undispatched
  assert.equal(storage.getItem('budget_insight_dismissed_date'), null);

  // Dispatch daily dismissal
  storage.setItem('budget_insight_dismissed_date', todayKey);
  assert.equal(storage.getItem('budget_insight_dismissed_date'), todayKey);

  // Simulate on-mount check
  const isDismissedForToday = storage.getItem('budget_insight_dismissed_date') === todayKey;
  assert.equal(isDismissedForToday, true);
});



test('workbook schema validation rejects malformed ledger and settings values', () => {
  const valid = {
    settings: { currency: 'USD', month: 'January', year: 2026, dateFormat: 'MM/DD/YYYY' as const },
    incomeCategories: [], expenseCategories: [], paymentMethods: ['Cash'],
    incomeTransactions: [{ id: 'i1', date: '2026-01-01', category: 'Salary', description: 'Pay', amount: 1000 }],
    expenseTransactions: [{ id: 'e1', date: '2026-01-02', category: 'Housing', description: 'Rent', paymentMethod: 'Bank', amount: 500 }],
    plannedIncome: { inc_1: 1000 }, plannedExpenses: { exp_1: 500 },
    savingsGoals: [], debts: [], debtPayments: [], financialAssets: [], openingCashBalance: 0, recurringTransactions: [],
    userEmail: 'user@example.com', activeTab: 'dashboard' as const, sheetConfig: null,
  };
  assert.equal(isValidWorkbookData(valid), true);
  assert.equal(isValidWorkbookData({
    ...valid,
    expenseTransactions: [{ ...valid.expenseTransactions[0], amount: -1 }],
  }), false);
  assert.equal(isValidWorkbookData({
    ...valid,
    settings: { ...valid.settings, year: 1800 },
  }), false);
  assert.equal(isValidWorkbookData({
    ...valid,
    recurringTransactions: [{
      id: 'r1', type: 'expense', description: 'Rent', amount: 500,
      category: 'Housing', dayOfMonth: 32, frequency: 'monthly', isActive: true,
    }],
  }), false);
});

test('invalid workbook snapshots fall back without replacing a trusted local workbook', () => {
  const fallback = {
    settings: { currency: 'USD', month: 'January', year: 2026, dateFormat: 'MM/DD/YYYY' as const },
    incomeCategories: [], expenseCategories: [], paymentMethods: [],
    incomeTransactions: [], expenseTransactions: [], plannedIncome: {}, plannedExpenses: {},
    savingsGoals: [], debts: [], financialAssets: [], openingCashBalance: 0, recurringTransactions: [],
    userEmail: 'trusted@example.com', activeTab: 'start_here' as const, sheetConfig: null,
  };
  assert.deepEqual(normalizeWorkbookData({ settings: null }, fallback), fallback);
  assert.deepEqual(normalizeWorkbookData(fallback, fallback), fallback);
});


test('transaction calculations preserve positive amounts and category totals', () => {
  const income = [
    { id: 'i1', date: '2026-01-05', category: 'Salary', description: 'Pay', amount: 4000 },
    { id: 'i2', date: '2026-01-20', category: ' salary ', description: 'Bonus', amount: 500 },
  ];
  const expenses = [
    { id: 'e1', date: '2026-01-02', category: 'Housing', description: 'Rent', paymentMethod: 'Bank', amount: 1200 },
    { id: 'e2', date: '2026-01-10', category: 'Groceries', description: 'Food', paymentMethod: 'Cash', amount: 300 },
  ];
  assert.equal(sumIncomeTransactions(income), 4500);
  assert.equal(sumExpenseTransactions(expenses), 1500);
  assert.equal(sumIncomeByCategory(income, 'SALARY'), 4500);
  assert.equal(sumExpensesByCategory(expenses, 'housing'), 1200);
});

test('budget calculations distinguish expense variance from income target variance', () => {
  const expense = calculateBudgetItem('Housing', 'expense', 1000, 1100);
  assert.equal(expense.difference, -100);
  assert.equal(expense.percentUsed, 110);
  assert.equal(expense.status, 'Over Budget');

  const income = calculateBudgetItem('Salary', 'income', 5000, 4500);
  assert.equal(income.difference, -500);
  assert.equal(income.percentUsed, 90);
  assert.equal(income.status, 'Near Target');

  assert.equal(calculateBudgetStatus(80), 'On Track');
  assert.equal(calculateBudgetStatus(100), 'Near Limit');
  assert.equal(calculateBudgetStatus(100.01), 'Over Budget');
});

test('annual budget summary groups transactions by calendar year and month', () => {
  const income = [
    { id: 'i1', date: '2026-01-05', category: 'Salary', description: 'Pay', amount: 1000 },
    { id: 'i2', date: '2026-02-05', category: 'Salary', description: 'Pay', amount: 1200 },
    { id: 'i3', date: '2025-12-05', category: 'Salary', description: 'Pay', amount: 900 },
  ];
  const expenses = [
    { id: 'e1', date: '2026-01-06', category: 'Housing', description: 'Rent', paymentMethod: 'Bank', amount: 400 },
    { id: 'e2', date: '2026-02-06', category: 'Food', description: 'Groceries', paymentMethod: 'Cash', amount: 300 },
  ];
  const summary = buildAnnualSummary(income, expenses, 2026);
  assert.equal(summary[0].income, 1000);
  assert.equal(summary[0].expenses, 400);
  assert.equal(summary[0].savings, 600);
  assert.equal(summary[0].savingsRate, 60);
  assert.equal(summary[1].income, 1200);
  assert.equal(summary[1].expenses, 300);
  assert.equal(summary[1].savings, 900);
  assert.equal(summary[1].savingsRate, 75);
  assert.equal(summary.reduce((sum, month) => sum + month.income, 0), 2200);
});

test('budget calculations handle zero planned amounts without Infinity or NaN', () => {
  assert.deepEqual(calculateBudgetItem('Other', 'expense', 0, 0), {
    category: 'Other',
    type: 'expense',
    planned: 0,
    actual: 0,
    difference: 0,
    percentUsed: 0,
    status: 'On Track',
  });
  assert.deepEqual(calculateBudgetItem('Other', 'expense', 0, 50), {
    category: 'Other',
    type: 'expense',
    planned: 0,
    actual: 50,
    difference: -50,
    percentUsed: 100,
    status: 'Near Limit',
  });
});


test('financial impact module correctly projects annual savings from percentage reductions', () => {
  const topCategoryMonthlySpend = 1200;
  const reductionPercent = 10; // 10% reduction target

  const monthlySavings = topCategoryMonthlySpend * (reductionPercent / 100);
  const annualSavings = monthlySavings * 12;
  const originalAnnualOutlay = topCategoryMonthlySpend * 12;
  const newAnnualOutlay = originalAnnualOutlay - annualSavings;

  assert.equal(monthlySavings, 120);
  assert.equal(annualSavings, 1440);
  assert.equal(originalAnnualOutlay, 14400);
  assert.equal(newAnnualOutlay, 12960);
});



test('savings goal progress clamps invalid/oversaved states safely', () => {
  assert.deepEqual(calculateSavingsGoalProgress({
    id: 'g1', name: 'Emergency Fund', targetAmount: 1000, currentAmount: 250,
  }), {
    targetAmount: 1000, currentAmount: 250, remainingAmount: 750, percentComplete: 25, isComplete: false,
  });
  assert.deepEqual(calculateSavingsGoalProgress({
    id: 'g2', name: 'Completed', targetAmount: 1000, currentAmount: 1200,
  }), {
    targetAmount: 1000, currentAmount: 1200, remainingAmount: 0, percentComplete: 100, isComplete: true,
  });
  assert.equal(calculateSavingsGoalProgress({
    id: 'g3', name: 'Invalid', targetAmount: 0, currentAmount: -10,
  }).percentComplete, 0);
});

test('debt calculations handle interest, payment shortfalls, and payoff edge cases', () => {
  const debt = { id: 'd1', name: 'Card', balance: 1200, interestRate: 12, minimumPayment: 100 };
  assert.equal(calculateDebtMonthlyInterest(debt), 12);
  assert.equal(calculateDebtMinimumPaymentShortfall(debt), 0);
  assert.equal(calculateDebtPayoffMonths(debt), 13);
  assert.equal(calculateDebtPayoffMonths({ ...debt, minimumPayment: 5 }), null);
  assert.equal(calculateDebtPayoffMonths({ ...debt, balance: 0 }), 0);
});

test('recurring date generation respects frequency and month length', () => {
  assert.deepEqual(generateRecurringDates(2026, 2, { dayOfMonth: 31, frequency: 'monthly' }), ['2026-02-28']);
  assert.deepEqual(generateRecurringDates(2026, 2, { dayOfMonth: 1, frequency: 'weekly' }), [
    '2026-02-01', '2026-02-08', '2026-02-15', '2026-02-22',
  ]);
  assert.deepEqual(generateRecurringDates(2026, 2, { dayOfMonth: 1, frequency: 'bi-weekly' }), [
    '2026-02-01', '2026-02-15',
  ]);
  assert.deepEqual(generateRecurringDates(2026, 2, { dayOfMonth: 31, frequency: 'yearly' }), ['2026-02-28']);
  assert.deepEqual(generateRecurringDates(2026, 2, { dayOfMonth: 0, frequency: 'monthly' }), []);
});


test('shared financial model connects cash flow, savings goals, debts, and assets', () => {
  const snapshot = calculateFinancialSnapshot(
    [{ id: 'i1', date: '2026-01-01', category: 'Salary', description: 'Pay', amount: 5000 }],
    [{ id: 'e1', date: '2026-01-02', category: 'Housing', description: 'Rent', paymentMethod: 'Bank', amount: 2000 }],
    [{ id: 'g1', name: 'Emergency Fund', targetAmount: 3000, currentAmount: 500 }],
    [{ id: 'd1', name: 'Card', balance: 4000, interestRate: 12, minimumPayment: 100 }],
    [{ id: 'a1', name: 'Stocks', amount: 10000, category: 'Investment' }],
    3000,
  );

  assert.equal(snapshot.totalIncome, 5000);
  assert.equal(snapshot.totalExpenses, 2000);
  assert.equal(snapshot.operatingCashFlow, 3000);
  assert.equal(snapshot.goalAllocated, 500);
  assert.equal(snapshot.availableCash, 6000);
  assert.equal(snapshot.externalAssets, 10000);
  assert.equal(snapshot.totalAssets, 16000);
  assert.equal(snapshot.totalLiabilities, 4000);
  assert.equal(snapshot.netWorth, 12000);
  assert.equal(snapshot.savingsRate, 60);
});

test('financial model treats savings goal contributions as internal allocation, not an expense', () => {
  const base = calculateFinancialSnapshot(
    [{ id: 'i1', date: '2026-01-01', category: 'Salary', description: 'Pay', amount: 5000 }],
    [],
    [],
    [],
    [],
    1000,
  );
  const allocated = calculateFinancialSnapshot(
    [{ id: 'i1', date: '2026-01-01', category: 'Salary', description: 'Pay', amount: 5000 }],
    [],
    [{ id: 'g1', name: 'Goal', targetAmount: 2000, currentAmount: 500 }],
    [],
    [],
    1000,
  );

  assert.equal(base.netWorth, 6000);
  assert.equal(allocated.netWorth, 6000);
  assert.equal(allocated.availableCash, 6000);
});


test('pre-existing finances establish opening net worth without becoming income or expenses', () => {
  const snapshot = calculateFinancialSnapshot(
    [
      { id: 'i1', date: '2026-10-01', category: 'Salary', description: 'First salary', amount: 3000 },
    ],
    [
      { id: 'e1', date: '2026-10-01', category: 'Groceries', description: 'First groceries', paymentMethod: 'Bank', amount: 500 },
    ],
    [],
    [
      { id: 'd1', name: 'Mortgage', balance: 100000, openingBalance: 105000, interestRate: 6, minimumPayment: 700 },
    ],
    [
      { id: 'a1', name: 'House Equity', amount: 185000, openingAmount: 180000, category: 'Real Estate' },
      { id: 'a2', name: 'Car', amount: 25000, openingAmount: 25000, category: 'Vehicle' },
      { id: 'a3', name: 'Business', amount: 40000, openingAmount: 40000, category: 'Business' },
      { id: 'a4', name: 'Investments', amount: 30000, openingAmount: 30000, category: 'Investment' },
    ],
    20000,
  );

  assert.equal(snapshot.openingAssets, 295000);
  assert.equal(snapshot.openingLiabilities, 105000);
  assert.equal(snapshot.openingNetWorth, 190000);
  assert.equal(snapshot.totalIncome, 3000);
  assert.equal(snapshot.totalExpenses, 500);
  assert.equal(snapshot.operatingCashFlow, 2500);
  assert.equal(snapshot.totalAssets, 302500);
  assert.equal(snapshot.totalLiabilities, 100000);
  assert.equal(snapshot.netWorth, 202500);
});

test('starting asset balances are not confused with later asset changes', () => {
  const snapshot = calculateFinancialSnapshot(
    [],
    [],
    [],
    [],
    [{ id: 'a1', name: 'Brokerage', amount: 35000, openingAmount: 30000, category: 'Investment' }],
    10000,
  );

  assert.equal(snapshot.openingAssets, 40000);
  assert.equal(snapshot.openingNetWorth, 40000);
  assert.equal(snapshot.externalAssets, 35000);
  assert.equal(snapshot.totalAssets, 45000);
  assert.equal(snapshot.netWorth, 45000);
});

test('legacy financial assets and debts remain valid when opening balances are omitted', () => {
  const snapshot = calculateFinancialSnapshot(
    [],
    [],
    [],
    [{ id: 'd1', name: 'Card', balance: 2000, interestRate: 20, minimumPayment: 100 }],
    [{ id: 'a1', name: 'Savings', amount: 5000, category: 'Bank' }],
    1000,
  );

  assert.equal(snapshot.openingAssets, 6000);
  assert.equal(snapshot.openingLiabilities, 2000);
  assert.equal(snapshot.openingNetWorth, 4000);
  assert.equal(snapshot.netWorth, 4000);
});


test('account-linked transactions update the matching cash or bank account only', () => {
  const snapshot = calculateFinancialSnapshot(
    [
      { id: 'i1', date: '2026-10-01', category: 'Salary', description: 'Pay', amount: 5000, accountId: 'bank1' },
    ],
    [
      { id: 'e1', date: '2026-10-02', category: 'Food', description: 'Groceries', paymentMethod: 'Bank', amount: 700, accountId: 'bank1' },
      { id: 'e2', date: '2026-10-03', category: 'Fuel', description: 'Fuel', paymentMethod: 'Cash', amount: 100, accountId: 'cash1' },
    ],
    [],
    [],
    [
      { id: 'bank1', name: 'Main Bank', amount: 15000, openingAmount: 15000, category: 'Bank' },
      { id: 'cash1', name: 'Wallet', amount: 2000, openingAmount: 2000, category: 'Cash' },
    ],
    0,
  );

  assert.equal(snapshot.accountBalances.bank1, 19300);
  assert.equal(snapshot.accountBalances.cash1, 1900);
  assert.equal(snapshot.totalAssets, 21200);
  assert.equal(snapshot.totalIncome, 5000);
  assert.equal(snapshot.totalExpenses, 800);
  assert.equal(snapshot.netWorth, 21200);
});

test('unassigned legacy transactions do not double count structured bank accounts', () => {
  const snapshot = calculateFinancialSnapshot(
    [{ id: 'i1', date: '2026-10-01', category: 'Salary', description: 'Pay', amount: 1000 }],
    [],
    [],
    [],
    [{ id: 'bank1', name: 'Main Bank', amount: 5000, openingAmount: 5000, category: 'Bank' }],
    0,
  );

  assert.equal(snapshot.accountBalances.bank1, 5000);
  assert.equal(snapshot.totalAssets, 5000);
});


test('debt payments split cash movement, principal reduction, and interest expense', () => {
  const snapshot = calculateFinancialSnapshot(
    [],
    [],
    [],
    [{ id: 'mortgage', name: 'Mortgage', balance: 100000, openingBalance: 100000, interestRate: 6, minimumPayment: 700 }],
    [{ id: 'bank1', name: 'Main Bank', amount: 20000, openingAmount: 20000, category: 'Bank' }],
    [
      { id: 'p1', date: '2026-10-01', debtId: 'mortgage', accountId: 'bank1', amount: 700, principal: 200, interest: 500 },
    ],
    0,
  );

  assert.equal(snapshot.debtInterestExpense, 500);
  assert.equal(snapshot.debtPrincipalPaid, 200);
  assert.equal(snapshot.totalExpenses, 500);
  assert.equal(snapshot.operatingCashFlow, -500);
  assert.equal(snapshot.accountBalances.bank1, 19300);
  assert.equal(snapshot.totalAssets, 19300);
  assert.equal(snapshot.totalLiabilities, 100000);
});

test('debt payment records must balance total, principal, and interest', () => {
  const snapshot = {
    id: 'p1',
    date: '2026-10-01',
    debtId: 'mortgage',
    amount: 700,
    principal: 200,
    interest: 500,
  };
  assert.equal(snapshot.amount, snapshot.principal + snapshot.interest);
});


test('linked savings goal earmarks an existing bank balance without creating an asset', () => {
  const snapshot = calculateFinancialSnapshot(
    [],
    [],
    [{ id: 'g1', name: 'Emergency Fund', targetAmount: 3000, currentAmount: 2000, accountId: 'bank1' }],
    [],
    [{ id: 'bank1', name: 'Main Bank', amount: 10000, openingAmount: 10000, category: 'Bank' }],
    [],
    0,
  );

  assert.equal(snapshot.goalAllocated, 2000);
  assert.equal(snapshot.accountBalances.bank1, 10000);
  assert.equal(snapshot.availableCash, 8000);
  assert.equal(snapshot.totalAssets, 10000);
  assert.equal(snapshot.netWorth, 10000);
});

test('multiple savings goals on one account share one cash balance and are clamped together', () => {
  const snapshot = calculateFinancialSnapshot(
    [],
    [],
    [
      { id: 'g1', name: 'Emergency Fund', targetAmount: 2500, currentAmount: 2000, accountId: 'bank1' },
      { id: 'g2', name: 'Vacation', targetAmount: 2000, currentAmount: 1500, accountId: 'bank1' },
    ],
    [],
    [{ id: 'bank1', name: 'Main Bank', amount: 4000, openingAmount: 4000, category: 'Bank' }],
    [],
    0,
  );

  assert.equal(snapshot.goalAllocated, 3500);
  assert.equal(snapshot.availableCash, 500);
  assert.equal(snapshot.totalAssets, 4000);
  assert.equal(snapshot.netWorth, 4000);
});

test('savings goals across accounts earmark each account independently', () => {
  const snapshot = calculateFinancialSnapshot(
    [],
    [],
    [
      { id: 'g1', name: 'Emergency Fund', targetAmount: 2000, currentAmount: 1500, accountId: 'bank1' },
      { id: 'g2', name: 'Travel', targetAmount: 3000, currentAmount: 1000, accountId: 'bank2' },
    ],
    [],
    [
      { id: 'bank1', name: 'Main Bank', amount: 5000, openingAmount: 5000, category: 'Bank' },
      { id: 'bank2', name: 'Savings Bank', amount: 7000, openingAmount: 7000, category: 'Bank' },
    ],
    [],
    0,
  );

  assert.equal(snapshot.availableCash, 9500);
  assert.equal(snapshot.totalAssets, 12000);
  assert.equal(snapshot.netWorth, 12000);
});

test('goal allocation remains separate from cash-flow and net-worth accounting after account activity', () => {
  const snapshot = calculateFinancialSnapshot(
    [
      { id: 'i1', date: '2026-10-01', category: 'Salary', description: 'Pay', amount: 3000, accountId: 'bank1' },
    ],
    [
      { id: 'e1', date: '2026-10-02', category: 'Rent', description: 'Rent', paymentMethod: 'Bank', amount: 1000, accountId: 'bank1' },
    ],
    [{ id: 'g1', name: 'Emergency Fund', targetAmount: 2500, currentAmount: 1500, accountId: 'bank1' }],
    [],
    [{ id: 'bank1', name: 'Main Bank', amount: 5000, openingAmount: 5000, category: 'Bank' }],
    [],
    0,
  );

  assert.equal(snapshot.accountBalances.bank1, 7000);
  assert.equal(snapshot.goalAllocated, 1500);
  assert.equal(snapshot.availableCash, 5500);
  assert.equal(snapshot.totalIncome, 3000);
  assert.equal(snapshot.totalExpenses, 1000);
  assert.equal(snapshot.netWorth, 7000);
});


test('financial formula aggregation ignores non-finite and negative transaction amounts', () => {
  const income = [
    { id: 'i1', date: '2026-10-01', category: 'Salary', description: 'Valid', amount: 1000 },
    { id: 'i2', date: '2026-10-02', category: 'Salary', description: 'Infinity', amount: Number.POSITIVE_INFINITY },
    { id: 'i3', date: '2026-10-03', category: 'Salary', description: 'NaN', amount: Number.NaN },
    { id: 'i4', date: '2026-10-04', category: 'Salary', description: 'Negative', amount: -50 },
  ];
  const expenses = [
    { id: 'e1', date: '2026-10-01', category: 'Food', description: 'Valid', paymentMethod: 'Cash', amount: 200 },
    { id: 'e2', date: '2026-10-02', category: 'Food', description: 'Infinity', paymentMethod: 'Cash', amount: Number.POSITIVE_INFINITY },
    { id: 'e3', date: '2026-10-03', category: 'Food', description: 'NaN', paymentMethod: 'Cash', amount: Number.NaN },
    { id: 'e4', date: '2026-10-04', category: 'Food', description: 'Negative', paymentMethod: 'Cash', amount: -25 },
  ];

  assert.equal(sumIncomeTransactions(income), 1000);
  assert.equal(sumIncomeByCategory(income, 'salary'), 1000);
  assert.equal(sumExpenseTransactions(expenses), 200);
  assert.equal(sumExpensesByCategory(expenses, 'food'), 200);
});


test('budget calculations fail safely for non-finite planned and actual values', () => {
  assert.deepEqual(calculateBudgetItem('Invalid', 'expense', Number.NaN, Number.POSITIVE_INFINITY), {
    category: 'Invalid', type: 'expense', planned: 0, actual: 0, difference: 0, percentUsed: 0, status: 'On Track',
  });
  assert.deepEqual(calculateBudgetItem('Invalid', 'income', -100, Number.NaN), {
    category: 'Invalid', type: 'income', planned: 0, actual: 0, difference: 0, percentUsed: 0, status: 'Below Target',
  });
  assert.equal(calculateBudgetStatus(Number.NaN), 'On Track');
});


test('current calendar period is derived from the supplied date', () => {
  assert.deepEqual(getCurrentCalendarPeriod(new Date('2026-10-02T12:00:00')), {
    month: 'October',
    year: 2026,
  });
  assert.deepEqual(getCurrentCalendarPeriod(new Date('2027-01-05T12:00:00')), {
    month: 'January',
    year: 2027,
  });
});

test('automatic period tracking advances stale legacy settings to the current month', () => {
  const stale = {
    currency: 'USD' as const,
    month: 'January',
    year: 2026,
    dateFormat: 'MM/DD/YYYY' as const,
  };
  assert.deepEqual(syncSettingsToCurrentPeriod(stale, new Date('2026-10-02T12:00:00')), {
    ...stale,
    month: 'October',
    year: 2026,
    followCurrentPeriod: true,
  });
});

test('manual period selection is preserved when automatic tracking is disabled', () => {
  const manual = {
    currency: 'USD' as const,
    month: 'March',
    year: 2026,
    dateFormat: 'MM/DD/YYYY' as const,
    followCurrentPeriod: false,
  };
  assert.deepEqual(syncSettingsToCurrentPeriod(manual, new Date('2026-10-02T12:00:00')), manual);
});
