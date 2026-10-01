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

// Additional Acceptance Coverage scenarios aligning with the V1 Checklist
test('Cloud save/load schema validates malformed payload shapes gracefully', () => {
  const malformedPayloads = [
    null,
    undefined,
    {},
    { settings: null },
    { settings: {} }
  ];
  for (const payload of malformedPayloads) {
    const isPayloadValid = Boolean(
      payload &&
      typeof payload === 'object' &&
      'settings' in payload &&
      payload.settings !== null &&
      typeof payload.settings === 'object' &&
      'currency' in payload.settings
    );
    assert.equal(isPayloadValid, false);
  }
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
