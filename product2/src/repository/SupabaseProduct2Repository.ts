import type {
  DebtAccount,
  DebtPayment,
  Product2Settings,
  Product2Workbook,
  SavingsContribution,
  SavingsGoal,
} from '../domain/types.js';
import { requireSupabase } from '../lib/supabase.js';
import type { Product2Repository } from './Product2Repository.js';

type DbSettings = {
  account_id: string;
  currency: string;
  date_format: string;
  interest_convention: 'nominal-annual';
  payment_timing: 'end-of-period';
  minimum_payment_policy: 'configured-minimum';
  decimal_places: number;
};

export class SupabaseProduct2Repository implements Product2Repository {
  constructor(
    private readonly accountId: string,
    private readonly displayName: string,
    private readonly email: string,
  ) {}

  async load(): Promise<Product2Workbook | null> {
    const client = requireSupabase();

    const [settingsResult, goalsResult, contributionsResult, debtsResult, paymentsResult] = await Promise.all([
      client.from('product2_settings').select('*').eq('account_id', this.accountId).maybeSingle(),
      client.from('product2_savings_goals').select('*').eq('account_id', this.accountId).order('created_at'),
      client.from('product2_savings_contributions').select('*').eq('account_id', this.accountId).order('contribution_date'),
      client.from('product2_debt_accounts').select('*').eq('account_id', this.accountId).order('created_at'),
      client.from('product2_debt_payments').select('*').eq('account_id', this.accountId).order('payment_date'),
    ]);

    for (const result of [settingsResult, goalsResult, contributionsResult, debtsResult, paymentsResult]) {
      if (result.error) throw result.error;
    }

    const settings = settingsResult.data
      ? mapSettings(settingsResult.data as DbSettings)
      : defaultSettings(this.accountId);
    const now = new Date().toISOString();

    return {
      account: {
        id: this.accountId,
        displayName: this.displayName,
        currency: settings.currency,
        createdAt: now,
        updatedAt: now,
      },
      settings,
      savingsGoals: (goalsResult.data ?? []).map(mapGoal),
      savingsContributions: (contributionsResult.data ?? []).map(mapContribution),
      debts: (debtsResult.data ?? []).map(mapDebt),
      debtPayments: (paymentsResult.data ?? []).map(mapPayment),
    };
  }

  async save(workbook: Product2Workbook): Promise<void> {
    this.assertAccount(workbook.account.id);
    const client = requireSupabase();

    const settings = {
      account_id: this.accountId,
      currency: workbook.settings.currency,
      date_format: workbook.settings.dateFormat,
      interest_convention: workbook.settings.interestConvention,
      payment_timing: workbook.settings.paymentTiming,
      minimum_payment_policy: workbook.settings.minimumPaymentPolicy,
      decimal_places: workbook.settings.calculationPreferences.decimalPlaces,
    };

    const settingsResult = await client.from('product2_settings').upsert(settings, { onConflict: 'account_id' });
    if (settingsResult.error) throw settingsResult.error;

    await this.syncRows('product2_savings_contributions', workbook.savingsContributions.map(toContribution));
    await this.syncRows('product2_debt_payments', workbook.debtPayments.map(toPayment));
    await this.syncRows('product2_savings_goals', workbook.savingsGoals.map(toGoal));
    await this.syncRows('product2_debt_accounts', workbook.debts.map(toDebt));
  }

  async saveSettings(settings: Product2Settings): Promise<void> {
    this.assertTenant(settings.accountId);
    const result = await requireSupabase().from('product2_settings').upsert({
      account_id: this.accountId,
      currency: settings.currency,
      date_format: settings.dateFormat,
      interest_convention: settings.interestConvention,
      payment_timing: settings.paymentTiming,
      minimum_payment_policy: settings.minimumPaymentPolicy,
      decimal_places: settings.calculationPreferences.decimalPlaces,
    }, { onConflict: 'account_id' });
    if (result.error) throw result.error;
  }

  async upsertSavingsGoal(goal: SavingsGoal): Promise<void> {
    this.assertTenant(goal.accountId);
    const result = await requireSupabase().from('product2_savings_goals').upsert(toGoal(goal), { onConflict: 'id' });
    if (result.error) throw result.error;
  }

  async deleteSavingsGoal(goalId: string): Promise<void> {
    const client = requireSupabase();
    const contributions = await client.from('product2_savings_contributions').delete().eq('account_id', this.accountId).eq('goal_id', goalId);
    if (contributions.error) throw contributions.error;
    const goal = await client.from('product2_savings_goals').delete().eq('account_id', this.accountId).eq('id', goalId);
    if (goal.error) throw goal.error;
  }

  async appendSavingsContribution(contribution: SavingsContribution): Promise<void> {
    this.assertTenant(contribution.accountId);
    const result = await requireSupabase().from('product2_savings_contributions').insert(toContribution(contribution));
    if (result.error) throw result.error;
  }

  async upsertDebt(debt: DebtAccount): Promise<void> {
    this.assertTenant(debt.accountId);
    const result = await requireSupabase().from('product2_debt_accounts').upsert(toDebt(debt), { onConflict: 'id' });
    if (result.error) throw result.error;
  }

  async deleteDebt(debtId: string): Promise<void> {
    const client = requireSupabase();
    const payments = await client.from('product2_debt_payments').delete().eq('account_id', this.accountId).eq('debt_id', debtId);
    if (payments.error) throw payments.error;
    const debt = await client.from('product2_debt_accounts').delete().eq('account_id', this.accountId).eq('id', debtId);
    if (debt.error) throw debt.error;
  }

  async appendDebtPayment(payment: DebtPayment): Promise<void> {
    this.assertTenant(payment.accountId);
    const client = requireSupabase();
    const result = await client.rpc('record_product2_debt_payment_for_account', {
      p_account_id: this.accountId,
      p_debt_id: payment.debtId,
      p_payment_id: payment.id,
      p_payment_date: payment.date,
      p_amount: payment.amount,
      p_note: payment.note ?? null,
    });
    if (result.error) throw result.error;
  }

  private async syncRows(table: string, rows: Record<string, unknown>[]) {
    const client = requireSupabase();
    const existing = await client.from(table).select('id').eq('account_id', this.accountId);
    if (existing.error) throw existing.error;

    const incomingIds = new Set(rows.map(row => String(row.id)));
    const staleIds = (existing.data ?? []).map(row => String(row.id)).filter(id => !incomingIds.has(id));

    if (staleIds.length) {
      const deleted = await client.from(table).delete().eq('account_id', this.accountId).in('id', staleIds);
      if (deleted.error) throw deleted.error;
    }

    if (rows.length) {
      const upserted = await client.from(table).upsert(rows, { onConflict: 'id' });
      if (upserted.error) throw upserted.error;
    }
  }

  private assertTenant(accountId: string) {
    if (accountId !== this.accountId) throw new Error('Product 2 account ownership mismatch.');
  }
}

function defaultSettings(accountId: string): Product2Settings {
  return {
    accountId: accountId,
    currency: 'SLE',
    dateFormat: 'YYYY-MM-DD',
    interestConvention: 'nominal-annual',
    paymentTiming: 'end-of-period',
    minimumPaymentPolicy: 'configured-minimum',
    calculationPreferences: { decimalPlaces: 2 },
  };
}

function mapSettings(row: DbSettings): Product2Settings {
  return {
    accountId: row.account_id,
    currency: row.currency,
    dateFormat: row.date_format,
    interestConvention: row.interest_convention,
    paymentTiming: row.payment_timing,
    minimumPaymentPolicy: row.minimum_payment_policy,
    calculationPreferences: { decimalPlaces: row.decimal_places },
  };
}

function mapGoal(row: any): SavingsGoal {
  return {
    id: row.id, accountId: row.account_id, name: row.name, targetAmount: Number(row.target_amount),
    openingBalance: Number(row.opening_balance), targetDate: row.target_date ?? undefined,
    contributionFrequency: row.contribution_frequency ?? undefined, plannedContribution: row.planned_contribution == null ? undefined : Number(row.planned_contribution),
    status: row.status, notes: row.notes ?? undefined,
  };
}

function mapContribution(row: any): SavingsContribution {
  return { id: row.id, accountId: row.account_id, goalId: row.goal_id, date: row.contribution_date, amount: Number(row.amount), source: row.source ?? undefined, note: row.note ?? undefined };
}

function mapDebt(row: any): DebtAccount {
  return {
    id: row.id, accountId: row.account_id, creditor: row.creditor, openingBalance: Number(row.opening_balance),
    balance: Number(row.balance), interestRate: row.interest_rate == null ? undefined : Number(row.interest_rate),
    minimumPayment: Number(row.minimum_payment), paymentFrequency: row.payment_frequency, fees: row.fees == null ? undefined : Number(row.fees),
    status: row.status, notes: row.notes ?? undefined,
  };
}

function mapPayment(row: any): DebtPayment {
  return {
    id: row.id, accountId: row.account_id, debtId: row.debt_id, date: row.payment_date, amount: Number(row.amount),
    principal: row.principal == null ? undefined : Number(row.principal),
    interest: row.interest == null ? undefined : Number(row.interest),
    fees: row.fees == null ? undefined : Number(row.fees),
    note: row.note ?? undefined,
  };
}

function toGoal(goal: SavingsGoal) {
  return {
    id: goal.id, account_id: goal.accountId, name: goal.name, target_amount: goal.targetAmount, opening_balance: goal.openingBalance,
    target_date: goal.targetDate ?? null, contribution_frequency: goal.contributionFrequency ?? null,
    planned_contribution: goal.plannedContribution ?? null, status: goal.status, notes: goal.notes ?? null,
  };
}

function toContribution(contribution: SavingsContribution) {
  return {
    id: contribution.id, account_id: contribution.accountId, goal_id: contribution.goalId,
    contribution_date: contribution.date, amount: contribution.amount, source: contribution.source ?? null, note: contribution.note ?? null,
  };
}

function toDebt(debt: DebtAccount) {
  return {
    id: debt.id, account_id: debt.accountId, creditor: debt.creditor, opening_balance: debt.openingBalance,
    balance: debt.balance, interest_rate: debt.interestRate ?? null, minimum_payment: debt.minimumPayment,
    payment_frequency: debt.paymentFrequency, fees: debt.fees ?? null, status: debt.status, notes: debt.notes ?? null,
  };
}

function toPayment(payment: DebtPayment) {
  return {
    id: payment.id, account_id: payment.accountId, debt_id: payment.debtId, payment_date: payment.date,
    amount: payment.amount, principal: payment.principal ?? null, interest: payment.interest ?? null, fees: payment.fees ?? null, note: payment.note ?? null,
  };
}
