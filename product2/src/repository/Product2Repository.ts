import type { Product2Settings, Product2Workbook, SavingsContribution, SavingsGoal, DebtAccount, DebtPayment } from '../domain/types.js';
import { calculatePaymentAllocation } from '../domain/debt.js';

export interface Product2Repository {
  load(): Promise<Product2Workbook | null>;
  save(workbook: Product2Workbook): Promise<void>;
  saveSettings(settings: Product2Settings): Promise<void>;
  upsertSavingsGoal(goal: SavingsGoal): Promise<void>;
  deleteSavingsGoal(goalId: string): Promise<void>;
  appendSavingsContribution(contribution: SavingsContribution): Promise<void>;
  upsertDebt(debt: DebtAccount): Promise<void>;
  deleteDebt(debtId: string): Promise<void>;
  appendDebtPayment(payment: DebtPayment): Promise<void>;
}

export class InMemoryProduct2Repository implements Product2Repository {
  private workbook: Product2Workbook | null = null;

  constructor(initial?: Product2Workbook) {
    this.workbook = initial ? structuredClone(initial) : null;
  }

  async load(): Promise<Product2Workbook | null> {
    return this.workbook ? structuredClone(this.workbook) : null;
  }

  async save(workbook: Product2Workbook): Promise<void> {
    this.workbook = structuredClone(workbook);
  }

  async saveSettings(settings: Product2Settings): Promise<void> {
    if (!this.workbook || this.workbook.account.id !== settings.accountId) throw new Error('Product 2 account is not initialized.');
    this.workbook.settings = structuredClone(settings);
  }

  async upsertSavingsGoal(goal: SavingsGoal): Promise<void> {
    this.requireAccount(goal.accountId);
    const index = this.workbook!.savingsGoals.findIndex(g => g.id === goal.id);
    if (index >= 0) this.workbook!.savingsGoals[index] = structuredClone(goal);
    else this.workbook!.savingsGoals.push(structuredClone(goal));
  }

  async deleteSavingsGoal(goalId: string): Promise<void> {
    this.requireInitialized();
    this.workbook!.savingsGoals = this.workbook!.savingsGoals.filter(g => g.id !== goalId);
    this.workbook!.savingsContributions = this.workbook!.savingsContributions.filter(c => c.goalId !== goalId);
  }

  async appendSavingsContribution(contribution: SavingsContribution): Promise<void> {
    this.requireAccount(contribution.accountId);
    if (!this.workbook!.savingsGoals.some(g => g.id === contribution.goalId)) throw new Error('Savings goal does not exist.');
    this.workbook!.savingsContributions.push(structuredClone(contribution));
  }

  async upsertDebt(debt: DebtAccount): Promise<void> {
    this.requireAccount(debt.accountId);
    const index = this.workbook!.debts.findIndex(d => d.id === debt.id);
    if (index >= 0) this.workbook!.debts[index] = structuredClone(debt);
    else this.workbook!.debts.push(structuredClone(debt));
  }

  async deleteDebt(debtId: string): Promise<void> {
    this.requireInitialized();
    this.workbook!.debts = this.workbook!.debts.filter(d => d.id !== debtId);
    this.workbook!.debtPayments = this.workbook!.debtPayments.filter(p => p.debtId !== debtId);
  }

  async appendDebtPayment(payment: DebtPayment): Promise<void> {
    this.requireAccount(payment.accountId);
    const debt = this.workbook!.debts.find(d => d.id === payment.debtId);
    if (!debt) throw new Error('Debt account does not exist.');
    const allocation = calculatePaymentAllocation(debt, payment.amount);
    debt.balance = Math.max(0, Math.round((debt.balance - allocation.principal) * 100) / 100);
    this.workbook!.debtPayments.push(structuredClone({ ...payment, amount: allocation.total, principal: allocation.principal, interest: allocation.interest, fees: allocation.fees }));
    if (debt.balance === 0) debt.status = 'paid';
  }

  private requireInitialized(): void {
    if (!this.workbook) throw new Error('Product 2 account is not initialized.');
  }

  private requireAccount(accountId: string): void {
    this.requireInitialized();
    if (this.workbook!.account.id !== accountId) throw new Error('Product 2 account ownership mismatch.');
  }
}
