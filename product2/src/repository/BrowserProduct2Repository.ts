import type { Product2Workbook } from '../domain/types.js';
import type { Product2Repository } from './Product2Repository.js';

export class BrowserProduct2Repository implements Product2Repository {
  private readonly key: string;
  private workbook: Product2Workbook | null;

  constructor(accountId: string, initial: Product2Workbook | null = null) {
    this.key = `budgetplanner.product2.workbook.${accountId}`;
    const stored = typeof window !== 'undefined' ? window.localStorage.getItem(this.key) : null;
    this.workbook = stored ? JSON.parse(stored) as Product2Workbook : initial ? structuredClone(initial) : null;
  }

  async load() { return this.workbook ? structuredClone(this.workbook) : null; }

  async save(workbook: Product2Workbook) {
    this.assertAccount(workbook.account.id);
    this.workbook = structuredClone(workbook);
    this.persist();
  }

  async saveSettings(settings: Product2Workbook['settings']) {
    this.requireInitialized();
    this.assertAccount(settings.accountId);
    this.workbook!.settings = structuredClone(settings);
    this.persist();
  }

  async upsertSavingsGoal(goal: Product2Workbook['savingsGoals'][number]) {
    this.requireAccount(goal.accountId);
    const i = this.workbook!.savingsGoals.findIndex(x => x.id === goal.id);
    if (i >= 0) this.workbook!.savingsGoals[i] = structuredClone(goal);
    else this.workbook!.savingsGoals.push(structuredClone(goal));
    this.persist();
  }

  async deleteSavingsGoal(goalId: string) {
    this.requireInitialized();
    this.workbook!.savingsGoals = this.workbook!.savingsGoals.filter(x => x.id !== goalId);
    this.workbook!.savingsContributions = this.workbook!.savingsContributions.filter(x => x.goalId !== goalId);
    this.persist();
  }

  async appendSavingsContribution(contribution: Product2Workbook['savingsContributions'][number]) {
    this.requireAccount(contribution.accountId);
    if (!this.workbook!.savingsGoals.some(x => x.id === contribution.goalId)) throw new Error('Savings goal does not exist.');
    this.workbook!.savingsContributions.push(structuredClone(contribution));
    this.persist();
  }

  async upsertDebt(debt: Product2Workbook['debts'][number]) {
    this.requireAccount(debt.accountId);
    const i = this.workbook!.debts.findIndex(x => x.id === debt.id);
    if (i >= 0) this.workbook!.debts[i] = structuredClone(debt);
    else this.workbook!.debts.push(structuredClone(debt));
    this.persist();
  }

  async deleteDebt(debtId: string) {
    this.requireInitialized();
    this.workbook!.debts = this.workbook!.debts.filter(x => x.id !== debtId);
    this.workbook!.debtPayments = this.workbook!.debtPayments.filter(x => x.debtId !== debtId);
    this.persist();
  }

  async appendDebtPayment(payment: Product2Workbook['debtPayments'][number]) {
    this.requireAccount(payment.accountId);
    const debt = this.workbook!.debts.find(x => x.id === payment.debtId);
    if (!debt) throw new Error('Debt account does not exist.');
    const requested = Math.max(0, Number.isFinite(payment.amount) ? payment.amount : 0);
    const balanceBefore = debt.balance;
    const rate = debt.interestRate == null ? 0 : Math.max(0, debt.interestRate) / 100 / (debt.paymentFrequency === 'weekly' ? 52 : debt.paymentFrequency === 'biweekly' ? 26 : 12);
    const interest = Math.round(balanceBefore * rate * 100) / 100;
    const total = Math.min(requested, Math.max(0, balanceBefore + interest + Math.max(0, debt.fees ?? 0)));
    const fees = Math.min(Math.max(0, debt.fees ?? 0), Math.max(0, total - interest));
    const principal = Math.max(0, Math.round((total - interest - fees) * 100) / 100);
    debt.balance = Math.max(0, Math.round((balanceBefore - principal) * 100) / 100);
    this.workbook!.debtPayments.push(structuredClone({ ...payment, amount: total, principal, interest, fees }));
    if (debt.balance === 0) debt.status = 'paid';
    this.persist();
  }

  private requireInitialized() { if (!this.workbook) throw new Error('Product 2 account is not initialized.'); }
  private requireAccount(accountId: string) { this.requireInitialized(); this.assertAccount(accountId); }
  private assertAccount(accountId: string) { if (!this.workbook || this.workbook.account.id !== accountId) throw new Error('Product 2 account ownership mismatch.'); }
  private persist() { if (typeof window !== 'undefined' && this.workbook) window.localStorage.setItem(this.key, JSON.stringify(this.workbook)); }
}
