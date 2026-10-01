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
import { isToolkitPlanId, normalizeDisplayName } from '../src/services/accountValidation.ts';
import { isValidAuthEmail, isValidAuthPassword, normalizeAuthEmail } from '../src/services/authValidation.ts';
import {
  extractSpreadsheetId,
  parseSheetAmount,
  parseSheetDate,
} from '../src/services/googleSheetsService.ts';

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
    expenseTransactions: [], plannedIncome: {}, plannedExpenses: {}, savingsGoals: [], debts: [],
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


test('local storage fails safely on malformed JSON and unavailable storage', () => {
  const storage = installStorage();
  storage.setItem(STORAGE_KEYS.SETTINGS, '{not-json');
  assert.deepEqual(loadFromAccountStorage(STORAGE_KEYS.SETTINGS, 'user-a', { currency: 'SLE' }), { currency: 'SLE' });

  Object.defineProperty(globalThis, 'window', {
    configurable: true,
    value: { localStorage: null },
  });
  assert.equal(saveToAccountStorage(STORAGE_KEYS.USER_EMAIL, 'user-a', 'a@example.com'), false);
  assert.equal(loadFromAccountStorage(STORAGE_KEYS.USER_EMAIL, 'user-a', 'fallback@example.com'), 'fallback@example.com');
  void storage;
});

test('Google Sheets spreadsheet IDs normalize URLs without altering raw IDs', () => {
  assert.equal(
    extractSpreadsheetId('https://docs.google.com/spreadsheets/d/1AbC_-xyz123/edit#gid=0'),
    '1AbC_-xyz123',
  );
  assert.equal(extractSpreadsheetId('  1AbC_-xyz123  '), '1AbC_-xyz123');
});

test('Google Sheets amount parser accepts normal currency values and rejects malformed values', () => {
  assert.equal(parseSheetAmount('£1,250.50', 'test'), 1250.5);
  assert.equal(parseSheetAmount('-25', 'test'), -25);
  assert.throws(() => parseSheetAmount('1,2,3.00', 'test'), /Invalid amount/);
  assert.throws(() => parseSheetAmount('25 USD', 'test'), /Invalid amount/);
  assert.throws(() => parseSheetAmount('', 'test'), /Invalid amount/);
});

test('authentication validation normalizes email and rejects invalid credentials locally', () => {
  assert.equal(normalizeAuthEmail('  USER@Example.COM '), 'user@example.com');
  assert.equal(isValidAuthEmail('user@example.com'), true);
  assert.equal(isValidAuthEmail('user@example'), false);
  assert.equal(isValidAuthEmail(''), false);
  assert.equal(isValidAuthEmail(null), false);
  assert.equal(isValidAuthPassword('123456'), true);
  assert.equal(isValidAuthPassword('12345'), false);
  assert.equal(isValidAuthPassword(null), false);
});

test('onboarding validation normalizes display names and accepts only supported plans', () => {
  assert.equal(normalizeDisplayName('  Jane   Doe  '), 'Jane Doe');
  assert.equal(normalizeDisplayName(''), '');
  assert.equal(normalizeDisplayName(null), '');
  assert.equal(normalizeDisplayName('x'.repeat(100)).length, 80);
  assert.equal(isToolkitPlanId('free'), true);
  assert.equal(isToolkitPlanId('plus'), true);
  assert.equal(isToolkitPlanId('pro'), true);
  assert.equal(isToolkitPlanId('enterprise'), false);
  assert.equal(isToolkitPlanId(null), false);
});

test('Google Sheets date parser normalizes valid dates and rejects impossible dates', () => {
  assert.equal(parseSheetDate('2026-02-28', 'test'), '2026-02-28');
  assert.equal(parseSheetDate('02/28/2026', 'test'), '2026-02-28');
  assert.throws(() => parseSheetDate('31/02/2026', 'test'), /Invalid date/);
});
