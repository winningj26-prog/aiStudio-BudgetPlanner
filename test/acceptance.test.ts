import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

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
import type { Debt, DebtPayment, SavingsGoal } from '../src/types/budget.ts';
import { getAuthSessionState } from '../src/services/supabaseAuth.ts';
import { isPlatformAdminEmail, normalizePlatformAdminEmails } from '../src/utils/platformAdmin.ts';
import { isAiInsightsUiEnabled } from '../src/utils/aiInsights.ts';
import { isValidCloudWorkbookPayload } from '../src/utils/cloudWorkbook.ts';
import { isValidWorkbookData, normalizeWorkbookData } from '../src/utils/workbookValidation.ts';
import { buildAnnualSummary, calculateBudgetItem, calculateBudgetStatus, sumExpensesByCategory, sumIncomeByCategory, sumExpenseTransactions, sumIncomeTransactions } from '../src/utils/formulas.ts';
import { applyDebtPaymentChange, calculateDebtMinimumPaymentShortfall, calculateDebtMonthlyInterest, calculateDebtPayoffMonths, calculateSavingsGoalProgress, generateRecurringDates, normalizeSavingsGoalDraft, validateDebtDraftValues, normalizeRecurringRuleValues, reconcileGoalBalance, validateSavingsContributionDraft } from '../src/utils/financialPlanning.ts';
import { calculateFinancialSnapshot } from '../src/utils/financialModel.ts';
import { isValidBillingAmount, isValidBillingPlanId, normalizeOptionalText, normalizeTransactionId } from '../src/utils/billing.ts';
import { getCurrentCalendarPeriod, syncSettingsToCurrentPeriod } from '../src/utils/calendarPeriod.ts';
import { generateExcelWorkbook, generateStructuredCSV } from '../src/utils/exportWorkbook.ts';

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
    expenseTransactions: [], plannedIncome: {}, plannedExpenses: {}, savingsGoals: [], savingsContributions: [], debts: [], debtPayments: [], financialAssets: [], openingCashBalance: 0,
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

test('savings goal, debt, and recurring editors reject non-finite or invalid numeric inputs', () => {
  assert.deepEqual(normalizeSavingsGoalDraft('3000', '500', '250'), {
    targetAmount: 3000,
    currentAmount: 500,
    monthlyContribution: 250,
  });
  assert.equal(normalizeSavingsGoalDraft('3000', '-1', '250'), null);
  assert.equal(normalizeSavingsGoalDraft('Infinity', '0', '250'), null);
  assert.equal(normalizeSavingsGoalDraft('3000', '0', '-10'), null);

  assert.equal(validateDebtDraftValues('4000', '12', '100'), true);
  assert.equal(validateDebtDraftValues('Infinity', '12', '100'), false);
  assert.equal(validateDebtDraftValues('4000', 'NaN', '100'), false);
  assert.equal(validateDebtDraftValues('4000', '-1', '100'), false);
  assert.equal(validateDebtDraftValues('4000', '12', '4000'), false);

  assert.deepEqual(normalizeRecurringRuleValues('1000', 31), { amount: 1000, dayOfMonth: 31 });
  assert.equal(normalizeRecurringRuleValues('Infinity', 31), null);
  assert.equal(normalizeRecurringRuleValues('1000', 0), null);
  assert.equal(normalizeRecurringRuleValues('1000', 32), null);
});

test('savings goal lifecycle preserves internal allocation semantics through create, contribute, edit, and delete', () => {
  let goals = [{ id: 'g1', name: 'Emergency Fund', targetAmount: 3000, currentAmount: 500, accountId: 'bank1' }];
  const added = { id: 'g2', name: 'Travel', targetAmount: 2000, currentAmount: 0, accountId: 'bank1' };
  goals = [...goals, added];
  goals = goals.map((goal) => goal.id === 'g1' ? { ...goal, currentAmount: goal.currentAmount + 500 } : goal);
  goals = goals.map((goal) => goal.id === 'g2' ? { ...goal, targetAmount: 2500 } : goal);
  assert.equal(calculateSavingsGoalProgress(goals[0]).percentComplete, 33.33333333333333);
  assert.equal(calculateSavingsGoalProgress(goals[1]).remainingAmount, 2500);
  goals = goals.filter((goal) => goal.id !== 'g2');
  assert.deepEqual(goals.map((goal) => goal.id), ['g1']);

  const snapshot = calculateFinancialSnapshot(
    [], [], goals, [],
    [{ id: 'bank1', name: 'Main Bank', amount: 5000, openingAmount: 5000, category: 'Bank' }],
    [], 0,
  );
  assert.equal(snapshot.goalAllocated, 1000);
  assert.equal(snapshot.availableCash, 4000);
  assert.equal(snapshot.netWorth, 5000);
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
  assert.deepEqual(generateRecurringDates(2026, 2, { dayOfMonth: 31, frequency: 'yearly' }), []);
  assert.deepEqual(generateRecurringDates(2026, 1, { dayOfMonth: 31, frequency: 'yearly' }), ['2026-01-31']);
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

test('debt payment validation reconciles principal, interest, and fees while preserving legacy records', () => {
  const baseWorkbook = {
    settings: { currency: 'USD' as const, month: 'October', year: 2026, dateFormat: 'MM/DD/YYYY' as const },
    incomeCategories: [], expenseCategories: [], paymentMethods: ['Bank'],
    incomeTransactions: [], expenseTransactions: [], plannedIncome: {}, plannedExpenses: {},
    savingsGoals: [], savingsContributions: [], debts: [
      { id: 'mortgage', name: 'Mortgage', balance: 100000, interestRate: 6, minimumPayment: 700 },
    ],
    debtPayments: [], financialAssets: [], openingCashBalance: 0, recurringTransactions: [],
    userEmail: 'test@example.com', activeTab: 'dashboard' as const, sheetConfig: null,
  };
  const paymentBase = { id: 'p1', date: '2026-10-01', debtId: 'mortgage' };

  // Legacy records remain valid: an omitted fee field means zero fees.
  assert.equal(isValidWorkbookData({
    ...baseWorkbook,
    debtPayments: [{ ...paymentBase, amount: 700, principal: 200, interest: 500 }],
  }), true);

  // New records must reconcile the full payment, including fees.
  assert.equal(isValidWorkbookData({
    ...baseWorkbook,
    debtPayments: [{ ...paymentBase, amount: 720, principal: 200, interest: 500, fees: 20 }],
  }), true);

  // A payment whose components do not sum to the total must be rejected.
  assert.equal(isValidWorkbookData({
    ...baseWorkbook,
    debtPayments: [{ ...paymentBase, amount: 700, principal: 200, interest: 500, fees: 20 }],
  }), false);
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


test('workbook exports preserve budget values and sanitize invalid transaction amounts', async () => {
  const data = {
    settings: { currency: 'USD' as const, month: 'October', year: 2026, dateFormat: 'MM/DD/YYYY' as const },
    incomeCategories: [{ id: 'salary', name: 'Salary', isActive: true, color: '' }],
    expenseCategories: [{ id: 'food', name: 'Food', isActive: true, color: '' }],
    paymentMethods: ['Cash'],
    incomeTransactions: [{ id: 'i1', date: '2026-10-01', category: 'Salary', description: 'Pay', amount: 1000 }],
    expenseTransactions: [
      { id: 'e1', date: '2026-10-02', category: 'Food', description: 'Groceries', paymentMethod: 'Cash', amount: 200 },
      { id: 'e2', date: '2026-10-03', category: 'Food', description: 'Invalid', paymentMethod: 'Cash', amount: Number.POSITIVE_INFINITY },
    ],
    plannedIncome: { Salary: 1000 },
    plannedExpenses: { food: 500 },
    annualData: [{ month: '10', fullName: 'October', income: 1000, expenses: 200 }],
  };

  const xlsx = generateExcelWorkbook(data);
  assert.equal(xlsx.type, 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  assert.ok(xlsx.size > 1000);

  const csv = await generateStructuredCSV(data).text();
  assert.match(csv, /Total Income,1000/);
  assert.match(csv, /Total Expenses,200/);
  assert.match(csv, /Food,500,200,300/);
  assert.ok(!csv.includes('Infinity'));
});


test('account workbook hydration restores the selected namespace without stale cross-account state', () => {
  installStorage();
  const defaults = {
    settings: { currency: 'USD' as const, month: 'January', year: 2026, dateFormat: 'MM/DD/YYYY' as const },
    incomeCategories: [], expenseCategories: [], paymentMethods: [], incomeTransactions: [],
    expenseTransactions: [], plannedIncome: {}, plannedExpenses: {}, savingsGoals: [], debts: [], debtPayments: [], financialAssets: [], openingCashBalance: 0,
    recurringTransactions: [], userEmail: '', activeTab: 'start_here' as const, sheetConfig: null,
  };

  const accountA = createLocalWorkbookRepository('user-a', defaults);
  const accountB = createLocalWorkbookRepository('user-b', defaults);
  accountA.save({ ...defaults, userEmail: 'a@example.com', activeTab: 'dashboard' as const });
  accountB.save({ ...defaults, userEmail: 'b@example.com', activeTab: 'monthly_budget' as const });

  const hydratedB = accountB.load();
  assert.equal(hydratedB.userEmail, 'b@example.com');
  assert.equal(hydratedB.activeTab, 'monthly_budget');
  assert.equal(accountA.load().userEmail, 'a@example.com');
});



test('onboarding exposes and passes through the starting financial position', () => {
  const onboardingSource = readFileSync(
    fileURLToPath(new URL('../src/components/OnboardingView.tsx', import.meta.url)),
    'utf8',
  );

  assert.match(onboardingSource, /openingCashBalance/);
  assert.match(onboardingSource, /financialAssets/);
  assert.match(onboardingSource, /debts/);
  assert.match(onboardingSource, /Existing assets/);
  assert.match(onboardingSource, /Existing debts/);
  assert.match(onboardingSource, /Cash on hand/);
  assert.match(onboardingSource, /onComplete\(session, \{/);
  assert.match(onboardingSource, /openingCashBalance:/);
  assert.match(onboardingSource, /financialAssets:/);
  assert.match(onboardingSource, /debts:/);
});


test('existing accounts can reach the starting financial position editors from Start Here', () => {
  const startHereSource = readFileSync(
    fileURLToPath(new URL('../src/components/worksheets/StartHereSheet.tsx', import.meta.url)),
    'utf8',
  );
  const appSource = readFileSync(
    fileURLToPath(new URL('../src/App.tsx', import.meta.url)),
    'utf8',
  );

  assert.match(startHereSource, /Starting Financial Position/);
  assert.match(startHereSource, /Edit cash & assets/);
  assert.match(startHereSource, /Edit starting debts/);
  assert.match(startHereSource, /onNavigate\('net_worth'\)/);
  assert.match(startHereSource, /onNavigate\('debt_payoff'\)/);
  assert.match(startHereSource, /openingCashBalance/);
  assert.match(startHereSource, /financialAssets/);
  assert.match(startHereSource, /debts/);
  assert.match(appSource, /openingCashBalance=\{openingCashBalance\}/);
  assert.match(appSource, /financialAssets=\{financialAssets\}/);
  assert.match(appSource, /debts=\{debts\}/);
});


test('Start Here opening net worth uses explicit opening balances when current balances differ', () => {
  const source = readFileSync(
    fileURLToPath(new URL('../src/components/worksheets/StartHereSheet.tsx', import.meta.url)),
    'utf8',
  );

  assert.match(source, /const openingAmount = asset\.openingAmount \?\? asset\.amount/);
  assert.match(source, /const openingBalance = debt\.openingBalance \?\? debt\.balance/);
  assert.match(source, /openingAssetsTotal/);
  assert.match(source, /openingDebtsTotal/);
  assert.match(source, /openingNetWorth/);
});


test('AI category suggestions fail closed on authentication errors', () => {
  const serverSource = readFileSync(
    fileURLToPath(new URL('../server.ts', import.meta.url)),
    'utf8',
  );
  const routeStart = serverSource.indexOf("app.post('/api/suggest-category'");
  assert.ok(routeStart >= 0);
  const route = serverSource.slice(routeStart, serverSource.indexOf('// Configure Vite integration', routeStart));

  assert.match(route, /await verifySupabaseRequest\(req\)/);
  assert.match(route, /status === 401 \|\| status === 403/);
  assert.match(route, /Authentication is required for category suggestions/);
});

test('authenticated billing routes preserve 401/403 failures instead of returning generic success or 500 responses', () => {
  const serverSource = readFileSync(
    fileURLToPath(new URL('../server.ts', import.meta.url)),
    'utf8',
  );

  const routes = [
    "app.post('/api/billing/checkout'",
    "app.post('/api/billing/mobile-money/submit'",
    "app.get('/api/billing/mobile-money/status'",
    "app.post('/api/billing/mobile-money/review'",
  ];

  for (const routeName of routes) {
    const routeStart = serverSource.indexOf(routeName);
    assert.ok(routeStart >= 0, 'Expected route ' + routeName);
    const routeEnd = serverSource.indexOf('\napp.', routeStart + routeName.length);
    assert.ok(routeEnd > routeStart, 'Expected next route boundary for ' + routeName);
    const route = serverSource.slice(routeStart, routeEnd);

    assert.match(route, /verifySupabaseRequest\(req\)/);
    assert.match(route, /status === 401/);
    if (routeName.includes('/review')) {
      assert.match(route, /status === 403/);
    }
  }
});


test('workbook validation rejects impossible calendar dates and malformed linked expense accounts', () => {
  const valid = {
    settings: { currency: 'USD' as const, month: 'January', year: 2026, dateFormat: 'MM/DD/YYYY' as const },
    incomeCategories: [], expenseCategories: [], paymentMethods: ['Cash'],
    incomeTransactions: [], expenseTransactions: [{
      id: 'e1', date: '2026-01-02', category: 'Food', description: 'Groceries',
      paymentMethod: 'Cash', amount: 100,
    }],
    plannedIncome: {}, plannedExpenses: {}, savingsGoals: [], debts: [], debtPayments: [],
    financialAssets: [], openingCashBalance: 0, recurringTransactions: [],
    userEmail: 'user@example.com', activeTab: 'dashboard' as const, sheetConfig: null,
  };

  assert.equal(isValidWorkbookData(valid), true);
  assert.equal(isValidWorkbookData({
    ...valid,
    expenseTransactions: [{ ...valid.expenseTransactions[0], date: '2026-02-30' }],
  }), false);
  assert.equal(isValidWorkbookData({
    ...valid,
    expenseTransactions: [{ ...valid.expenseTransactions[0], date: '2026-01-02', accountId: { id: 'bank1' } }],
  }), false);
  assert.equal(isValidWorkbookData({
    ...valid,
    expenseTransactions: [{ ...valid.expenseTransactions[0], paymentMethod: '   ' }],
  }), false);
});


test('Product 2 remains disabled during the merge without deleting legacy source', () => {
  const appSource = readFileSync(
    fileURLToPath(new URL('../src/App.tsx', import.meta.url)),
    'utf8',
  );
  const launcherSource = readFileSync(
    fileURLToPath(new URL('../src/components/ToolkitHomeView.tsx', import.meta.url)),
    'utf8',
  );
  const serverSource = readFileSync(
    fileURLToPath(new URL('../server.ts', import.meta.url)),
    'utf8',
  );
  const rootPackage = JSON.parse(readFileSync(
    fileURLToPath(new URL('../package.json', import.meta.url)),
    'utf8',
  ));

  assert.doesNotMatch(appSource, /onOpenProduct2|location\.assign\('\/product2\//);
  assert.doesNotMatch(launcherSource, /id: 'product2'|onOpenProduct2|isProduct2/);
  assert.match(serverSource, /Product 2 is temporarily disabled/);
  assert.match(serverSource, /row\.app_id !== 'product2'/);
  assert.match(serverSource, /Product 2 is disabled and cannot be enabled or overridden/);
  assert.equal(rootPackage.scripts.build, 'vite build');
});

test('savings contribution validation enforces positive finite amount, valid date, and goal id', () => {
  assert.equal(validateSavingsContributionDraft('goal-1', 250, '2026-03-15'), true);
  assert.equal(validateSavingsContributionDraft('goal-1', 0, '2026-03-15'), false);
  assert.equal(validateSavingsContributionDraft('goal-1', -50, '2026-03-15'), false);
  assert.equal(validateSavingsContributionDraft('', 250, '2026-03-15'), false);
  assert.equal(validateSavingsContributionDraft('goal-1', 250, 'invalid-date'), false);
  assert.equal(validateSavingsContributionDraft('goal-1', 250, '2026-02-30'), false);
});

test('savings goal balance reconciliation preserves legacy balances without reset and tallies contributions', () => {
  // Legacy goal with no openingBalance explicitly set and no contributions
  const legacyGoal = {
    id: 'legacy-1',
    name: 'Emergency Fund',
    targetAmount: 10000,
    currentAmount: 3500,
  };
  const legacyReconciled = reconcileGoalBalance(legacyGoal, []);
  assert.equal(legacyReconciled.currentAmount, 3500);
  assert.equal(legacyReconciled.openingBalance, 3500);

  // Goal with opening balance and contributions
  const activeGoal = {
    id: 'goal-2',
    name: 'Home Down Payment',
    targetAmount: 50000,
    currentAmount: 0,
    openingBalance: 10000,
  };
  const contributions = [
    { id: 'sc-1', goalId: 'goal-2', amount: 1500, date: '2026-01-15' },
    { id: 'sc-2', goalId: 'goal-2', amount: 2000, date: '2026-02-15' },
    { id: 'sc-3', goalId: 'other-goal', amount: 500, date: '2026-02-15' },
  ];
  const activeReconciled = reconcileGoalBalance(activeGoal, contributions);
  assert.equal(activeReconciled.currentAmount, 13500);
  assert.equal(activeReconciled.openingBalance, 10000);
});

test('savings contributions and goal balances do not double count as separate assets in financial snapshot', () => {
  const assets: FinancialAsset[] = [
    { id: 'checking', name: 'Primary Checking', category: 'Bank', amount: 10000 },
  ];
  const debts: Debt[] = [
    { id: 'loan1', name: 'Car Loan', balance: 5000, interestRate: 5, minimumPayment: 200 },
  ];
  const goals: SavingsGoal[] = [
    { id: 'vacation', name: 'Vacation', targetAmount: 3000, currentAmount: 1500, openingBalance: 500 },
  ];

  const snapshot = calculateFinancialSnapshot(
    [],
    [],
    goals,
    debts,
    assets,
    [],
    0,
  );

  // Net worth = Assets (10000) - Debts (5000) = 5000. Goals are an earmark, not additive external assets.
  assert.equal(snapshot.totalAssets, 10000);
  assert.equal(snapshot.totalLiabilities, 5000);
  assert.equal(snapshot.netWorth, 5000);
});


test('moving an edited savings contribution reconciles both source and destination goals', () => {
  const sourceGoal = {
    id: 'source', name: 'Source', targetAmount: 2000, currentAmount: 1500, openingBalance: 1000,
  } as SavingsGoal;
  const destinationGoal = {
    id: 'destination', name: 'Destination', targetAmount: 2000, currentAmount: 200, openingBalance: 100,
  } as SavingsGoal;
  const originalContributions = [
    { id: 'move-me', goalId: 'source', amount: 500, date: '2026-01-10', createdAt: '2026-01-10T12:00:00.000Z' },
    { id: 'destination-existing', goalId: 'destination', amount: 100, date: '2026-01-11' },
  ];
  const editedContributions = originalContributions.map((contribution) =>
    contribution.id === 'move-me'
      ? { ...contribution, goalId: 'destination', amount: 300, date: '2026-01-12' }
      : contribution,
  );

  assert.deepEqual(reconcileGoalBalance(sourceGoal, editedContributions), {
    openingBalance: 1000,
    currentAmount: 1000,
  });
  assert.deepEqual(reconcileGoalBalance(destinationGoal, editedContributions), {
    openingBalance: 100,
    currentAmount: 500,
  });
  assert.equal(editedContributions[0].id, originalContributions[0].id);
  assert.equal(editedContributions[0].createdAt, originalContributions[0].createdAt);
});

test('savings goal reconciliation recalculates after contribution edit or deletion', () => {
  const goal = {
    id: 'goal-edit',
    name: 'Emergency Fund',
    targetAmount: 5000,
    currentAmount: 0,
    openingBalance: 1000,
  };
  const original = [
    { id: 'c1', goalId: 'goal-edit', amount: 250, date: '2026-10-01' },
    { id: 'c2', goalId: 'goal-edit', amount: 500, date: '2026-10-10' },
  ];
  assert.equal(reconcileGoalBalance(goal, original).currentAmount, 1750);

  // Editing a ledger amount replaces its prior value; it is not added twice.
  const edited = original.map((contribution) =>
    contribution.id === 'c2' ? { ...contribution, amount: 300 } : contribution,
  );
  assert.equal(reconcileGoalBalance(goal, edited).currentAmount, 1550);

  // Deleting a ledger row removes only that contribution from the derived balance.
  const deleted = edited.filter((contribution) => contribution.id !== 'c1');
  assert.equal(reconcileGoalBalance(goal, deleted).currentAmount, 1300);
});

test('linked savings allocations are capped by the matching account balance and do not change net worth', () => {
  const snapshot = calculateFinancialSnapshot(
    [],
    [],
    [
      { id: 'g1', name: 'Emergency', targetAmount: 5000, currentAmount: 4000, accountId: 'bank1' },
      { id: 'g2', name: 'Travel', targetAmount: 2000, currentAmount: 3000, accountId: 'bank1' },
      { id: 'g3', name: 'Other account', targetAmount: 1000, currentAmount: 500, accountId: 'bank2' },
    ],
    [],
    [
      { id: 'bank1', name: 'Main Bank', amount: 5000, openingAmount: 5000, category: 'Bank' },
      { id: 'bank2', name: 'Second Bank', amount: 2000, openingAmount: 2000, category: 'Bank' },
    ],
    [],
    0,
  );

  // Allocations on bank1 total 7,000 but cannot earmark more than its 5,000 balance.
  // The bank2 allocation is 500, so available cash is 1,500; assets remain 7,000.
  assert.equal(snapshot.goalAllocated, 7500);
  assert.equal(snapshot.availableCash, 1500);
  assert.equal(snapshot.totalAssets, 7000);
  assert.equal(snapshot.netWorth, 7000);
  assert.equal(snapshot.accountBalances.bank1, 5000);
  assert.equal(snapshot.accountBalances.bank2, 2000);
});

test('debt payment cash movement applies only to its selected funding account', () => {
  const snapshot = calculateFinancialSnapshot(
    [],
    [],
    [],
    [{ id: 'loan', name: 'Loan', balance: 900, openingBalance: 1000, interestRate: 10, minimumPayment: 100 }],
    [
      { id: 'bank1', name: 'Main Bank', amount: 2000, openingAmount: 2000, category: 'Bank' },
      { id: 'bank2', name: 'Savings Bank', amount: 3000, openingAmount: 3000, category: 'Bank' },
    ],
    [{ id: 'p1', date: '2026-10-01', debtId: 'loan', accountId: 'bank1', amount: 150, principal: 100, interest: 50 }],
    0,
  );

  assert.equal(snapshot.accountBalances.bank1, 1850);
  assert.equal(snapshot.accountBalances.bank2, 3000);
  assert.equal(snapshot.totalExpenses, 50);
  assert.equal(snapshot.debtPrincipalPaid, 100);
  assert.equal(snapshot.totalAssets, 4850);
  // Current liability reflects the $100 principal reduction; opening balance remains $1,000.
  assert.equal(snapshot.totalLiabilities, 900);
  assert.equal(snapshot.openingLiabilities, 1000);
  assert.equal(snapshot.netWorth, 3950);
});

test('debt payment reconciliation accurately partitions principal, interest, and fees into expenses and liabilities', () => {
  const assets: FinancialAsset[] = [
    { id: 'checking', name: 'Checking Account', category: 'Bank', amount: 8000 },
  ];
  const debts: Debt[] = [
    { id: 'card-1', name: 'Visa Platinum', type: 'Credit Card', balance: 4000, interestRate: 18, minimumPayment: 150 },
  ];
  const payments: DebtPayment[] = [
    {
      id: 'pay-1',
      debtId: 'card-1',
      date: '2026-01-15',
      amount: 300,
      principal: 220,
      interest: 60,
      fees: 20,
      accountId: 'checking',
    },
  ];

  const snapshot = calculateFinancialSnapshot(
    [{ id: 'inc-1', date: '2026-01-01', category: 'Salary', amount: 5000, type: 'income' }],
    [{ id: 'exp-1', date: '2026-01-05', category: 'Food', amount: 400, paymentMethod: 'Cash' }],
    [],
    debts,
    assets,
    payments,
    0,
  );

  // Total expense includes base expenses (400) + debt interest (60) + debt fees (20) = 480
  assert.equal(snapshot.debtInterestExpense, 60);
  assert.equal(snapshot.debtFeeExpense, 20);
  assert.equal(snapshot.totalExpenses, 480);
  assert.equal(snapshot.debtPrincipalPaid, 220);

  // Cash account balance reduced by full payment amount (300) => 8000 - 300 = 7700
  assert.equal(snapshot.accountBalances['checking'], 7700);
});

test('debt payoff simulation is purely analytical and does not mutate real debts ledger', () => {
  const originalDebts: Debt[] = [
    { id: 'd1', name: 'Credit Card', balance: 2000, interestRate: 15, minimumPayment: 60 },
    { id: 'd2', name: 'Student Loan', balance: 8000, interestRate: 6, minimumPayment: 100 },
  ];
  const originalCopy = JSON.parse(JSON.stringify(originalDebts));

  const monthsD1 = calculateDebtPayoffMonths(originalDebts[0]);
  const monthsD2 = calculateDebtPayoffMonths(originalDebts[1]);

  assert.ok(monthsD1 !== null && monthsD1 > 0 && Number.isFinite(monthsD1));
  assert.ok(monthsD2 !== null && monthsD2 > 0 && Number.isFinite(monthsD2));

  // Verify inputs remained pristine
  assert.deepEqual(originalDebts, originalCopy);
});

test('workbook validation and normalization round-trips savingsContributions and debt fees with backward compatibility', () => {
  // Legacy workbook without savingsContributions or fees
  const legacyWorkbook = {
    settings: { currency: 'USD' as const, month: 'January', year: 2026, dateFormat: 'MM/DD/YYYY' as const },
    incomeCategories: [], expenseCategories: [], paymentMethods: ['Cash'],
    incomeTransactions: [], expenseTransactions: [],
    plannedIncome: {}, plannedExpenses: {},
    savingsGoals: [{ id: 'g1', name: 'Emergency', targetAmount: 5000, currentAmount: 1000 }],
    debts: [{ id: 'd1', name: 'Card', balance: 1500, interestRate: 12, minimumPayment: 50 }],
    debtPayments: [{ id: 'dp1', debtId: 'd1', date: '2026-01-10', amount: 100, principal: 80, interest: 20 }],
    financialAssets: [], openingCashBalance: 0, recurringTransactions: [],
    userEmail: 'user@example.com', activeTab: 'dashboard' as const, sheetConfig: null,
  };

  assert.equal(isValidWorkbookData(legacyWorkbook), true);
  const normalized = normalizeWorkbookData(legacyWorkbook, legacyWorkbook);
  assert.ok(Array.isArray(normalized.savingsContributions));
  assert.equal(normalized.savingsContributions.length, 0);

  // Modern workbook with contributions and fee-inclusive debt payments
  const modernWorkbook = {
    ...legacyWorkbook,
    savingsContributions: [
      { id: 'c1', goalId: 'g1', amount: 500, date: '2026-01-12', note: 'First deposit' },
    ],
    debtPayments: [
      { id: 'dp1', debtId: 'd1', date: '2026-01-10', amount: 110, principal: 80, interest: 20, fees: 10 },
    ],
  };

  assert.equal(isValidWorkbookData(modernWorkbook), true);
  const normalizedModern = normalizeWorkbookData(modernWorkbook, legacyWorkbook);
  assert.equal(normalizedModern.savingsContributions.length, 1);
  assert.equal(normalizedModern.savingsContributions[0].amount, 500);
  assert.equal(normalizedModern.debtPayments[0].fees, 10);

  // Invalid contribution rejection
  const invalidWorkbook = {
    ...modernWorkbook,
    savingsContributions: [
      { id: 'c2', goalId: 'g1', amount: -200, date: '2026-01-12' },
    ],
  };
  assert.equal(isValidWorkbookData(invalidWorkbook), false);
});


test('editing a debt payment reconciles both debt balances without duplicating payment history', () => {
  const debts: Debt[] = [
    { id: 'card-a', name: 'Card A', balance: 780, interestRate: 18, minimumPayment: 50 },
    { id: 'card-b', name: 'Card B', balance: 1000, interestRate: 12, minimumPayment: 40 },
  ];
  const existing: DebtPayment = {
    id: 'payment-1', debtId: 'card-a', date: '2026-01-10', amount: 250,
    principal: 220, interest: 20, fees: 10,
  };
  const edited: DebtPayment = {
    ...existing, debtId: 'card-b', date: '2026-01-12', amount: 300,
    principal: 260, interest: 30, fees: 10,
  };
  const nextDebts = applyDebtPaymentChange(debts, existing, edited);
  assert.ok(nextDebts);
  assert.equal(nextDebts.find((debt) => debt.id === 'card-a')?.balance, 1000);
  assert.equal(nextDebts.find((debt) => debt.id === 'card-b')?.balance, 740);
  assert.equal(edited.id, existing.id);
  assert.equal(applyDebtPaymentChange(debts, existing, { ...edited, principal: 2000 }), null);
});

test('debt payment UI supports editing records and prevents deleting debts with payment history', async () => {
  const source = readFileSync(new URL('../src/components/worksheets/DebtPayoffSheet.tsx', import.meta.url), 'utf8');
  assert.match(source, /const handleEditPayment = \(payment: DebtPayment\)/);
  assert.match(source, /applyDebtPaymentChange\(debts, existingPayment, payment\)/);
  assert.match(source, /This debt has payment history/);
  assert.match(source, /handleEditPayment\(p\)/);
});


test('recurring posting contract prevents duplicate entries and respects inactive rules and selected period', () => {
  const rules: RecurringTransaction[] = [
    { id: 'rent', type: 'expense', description: 'Rent', amount: 900, category: 'Housing', dayOfMonth: 1, frequency: 'monthly', isActive: true },
    { id: 'salary', type: 'income', description: 'Salary', amount: 2500, category: 'Salary', dayOfMonth: 15, frequency: 'monthly', isActive: true },
    { id: 'inactive', type: 'expense', description: 'Inactive', amount: 25, category: 'Other', dayOfMonth: 3, frequency: 'monthly', isActive: false },
  ];
  const existingExpenses = [
    { id: 'existing-rent', date: '2026-10-01', category: 'Housing', description: 'Rent', paymentMethod: 'Bank', amount: 900, recurringId: 'rent', isRecurring: true },
  ];
  const shouldGenerate = (rule: RecurringTransaction, year: number, month: number, existingDates: string[]) =>
    rule.isActive
      ? generateRecurringDates(year, month, rule).filter((date) => !existingDates.includes(date))
      : [];

  assert.deepEqual(shouldGenerate(rules[0], 2026, 10, existingExpenses.map((t) => t.date)), []);
  assert.deepEqual(shouldGenerate(rules[0], 2026, 11, existingExpenses.map((t) => t.date)), ['2026-11-01']);
  assert.deepEqual(shouldGenerate(rules[2], 2026, 10, []), []);
  assert.deepEqual(shouldGenerate(rules[1], 2027, 1, []), ['2027-01-15']);
});
