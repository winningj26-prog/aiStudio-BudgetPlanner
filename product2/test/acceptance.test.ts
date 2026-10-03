import test from 'node:test';
import assert from 'node:assert/strict';
import { calculatePaymentAllocation, projectMinimumPayment, projectRepaymentScenario } from '../src/domain/debt.js';
import { calculateSavingsProgress } from '../src/domain/savings.js';
import { validateDebt, validateSavingsGoal } from '../src/domain/validation.js';
import { InMemoryProduct2Repository } from '../src/repository/Product2Repository.js';
import type { Product2Workbook } from '../src/domain/types.js';

const workbook = (): Product2Workbook => ({
  account: { id: 'p2-a', displayName: 'Product 2 Test', currency: 'USD', createdAt: '2026-10-03T00:00:00Z', updatedAt: '2026-10-03T00:00:00Z' },
  settings: {
    accountId: 'p2-a',
    currency: 'USD',
    dateFormat: 'YYYY-MM-DD',
    interestConvention: 'nominal-annual',
    paymentTiming: 'end-of-period',
    minimumPaymentPolicy: 'configured-minimum',
    calculationPreferences: { decimalPlaces: 2 }
  },
  savingsGoals: [],
  savingsContributions: [],
  debts: [],
  debtPayments: []
});

test('Product 2 starts with an empty workbook and persists independently', async () => {
  const repo = new InMemoryProduct2Repository(workbook());
  const loaded = await repo.load();
  assert.equal(loaded?.account.id, 'p2-a');
  assert.deepEqual(loaded?.debts, []);
  assert.deepEqual(loaded?.savingsGoals, []);
});

test('savings contributions update only the selected goal', () => {
  const a = { id: 'g1', accountId: 'p2-a', name: 'Emergency fund', targetAmount: 1000, openingBalance: 100, plannedContribution: 100, contributionFrequency: 'monthly' as const, status: 'active' as const };
  const b = { ...a, id: 'g2', name: 'Travel' };
  const result = calculateSavingsProgress(a, [
    { id: 'c1', accountId: 'p2-a', goalId: 'g1', date: '2026-10-01', amount: 200 },
    { id: 'c2', accountId: 'p2-a', goalId: 'g2', date: '2026-10-01', amount: 999 }
  ]);
  assert.equal(result.currentBalance, 300);
  assert.equal(calculateSavingsProgress(b, []).currentBalance, 100);
});

test('completed savings goal is capped at target and reaches 100%', () => {
  const goal = { id: 'g1', accountId: 'p2-a', name: 'Goal', targetAmount: 500, openingBalance: 500, status: 'completed' as const };
  const result = calculateSavingsProgress(goal, []);
  assert.equal(result.currentBalance, 500);
  assert.equal(result.remainingAmount, 0);
  assert.equal(result.completionPercentage, 100);
});

test('zero-balance debt has immediate payoff and no interest', () => {
  const debt = { id: 'd0', accountId: 'p2-a', creditor: 'Paid', openingBalance: 100, balance: 0, interestRate: 10, minimumPayment: 20, paymentFrequency: 'monthly' as const, status: 'paid' as const };
  assert.deepEqual(projectMinimumPayment(debt), { debtId: 'd0', payoffMonth: 0, totalInterest: 0, totalPayments: 0, steps: [] });
});

test('missing interest rate is treated as 0% under Product 2 assumptions', () => {
  const debt = { id: 'd1', accountId: 'p2-a', creditor: 'Unknown rate', openingBalance: 1000, balance: 1000, minimumPayment: 100, paymentFrequency: 'monthly' as const, status: 'active' as const };
  const projection = projectMinimumPayment(debt);
  assert.equal(projection.totalInterest, 0);
  assert.equal(projection.payoffMonth, 10);
});

test('payment allocation never creates negative balance through overpayment', () => {
  const debt = { id: 'd2', accountId: 'p2-a', creditor: 'Small', openingBalance: 50, balance: 50, interestRate: 0, minimumPayment: 10, paymentFrequency: 'monthly' as const, status: 'active' as const };
  assert.deepEqual(calculatePaymentAllocation(debt, 100), { interest: 0, principal: 50, fees: 0, total: 50 });
});

test('snowball and avalanche are deterministic and use the same starting debts', () => {
  const debts = [
    { id: 'd1', accountId: 'p2-a', creditor: 'Small', openingBalance: 500, balance: 500, interestRate: 5, minimumPayment: 100, paymentFrequency: 'monthly' as const, status: 'active' as const },
    { id: 'd2', accountId: 'p2-a', creditor: 'High rate', openingBalance: 1500, balance: 1500, interestRate: 20, minimumPayment: 100, paymentFrequency: 'monthly' as const, status: 'active' as const }
  ];
  const snowball = projectRepaymentScenario(debts, 'snowball');
  const avalanche = projectRepaymentScenario(debts, 'avalanche');
  assert.deepEqual(snowball.order[0], 'd1');
  assert.deepEqual(avalanche.order[0], 'd2');
  assert.equal(snowball.strategy, 'snowball');
  assert.equal(avalanche.strategy, 'avalanche');
});

test('debt payments remain account-scoped in the repository', async () => {
  const repo = new InMemoryProduct2Repository(workbook());
  await repo.upsertDebt({ id: 'd1', accountId: 'p2-a', creditor: 'Card', openingBalance: 100, balance: 100, interestRate: 0, minimumPayment: 20, paymentFrequency: 'monthly', status: 'active' });
  await repo.appendDebtPayment({ id: 'p1', accountId: 'p2-a', debtId: 'd1', date: '2026-10-03', amount: 30 });
  const loaded = await repo.load();
  assert.equal(loaded?.debts[0].balance, 70);
  assert.equal(loaded?.debtPayments[0].amount, 30);
});

test('validation rejects invalid debt and savings values', () => {
  const debt = { id: 'd', accountId: 'p2-a', creditor: ' ', openingBalance: 1, balance: 1, interestRate: -1, minimumPayment: 0, paymentFrequency: 'monthly' as const, status: 'active' as const };
  const goal = { id: 'g', accountId: 'p2-a', name: ' ', targetAmount: 0, openingBalance: -1, status: 'active' as const };
  assert.ok(validateDebt(debt).length >= 3);
  assert.ok(validateSavingsGoal(goal).length >= 3);
});
