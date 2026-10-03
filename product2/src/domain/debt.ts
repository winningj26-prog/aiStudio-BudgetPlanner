import type { DebtAccount, DebtProjection, RepaymentScenario, RepaymentStep } from './types.js';

const round = (n: number) => Math.round(n * 100) / 100;
const paymentPeriodsPerYear = (frequency: DebtAccount['paymentFrequency']) =>
  frequency === 'weekly' ? 52 : frequency === 'biweekly' ? 26 : 12;

function periodicRate(debt: DebtAccount): number {
  if (debt.interestRate == null) return 0;
  return Math.max(0, debt.interestRate) / 100 / paymentPeriodsPerYear(debt.paymentFrequency);
}

function applyPayment(balance: number, payment: number, rate: number) {
  const interest = round(balance * rate);
  const applied = Math.min(Math.max(0, payment), round(balance + interest));
  return { interest, payment: applied, endingBalance: round(Math.max(0, balance + interest - applied)) };
}

export function calculatePaymentAllocation(
  debt: DebtAccount,
  requestedPayment: number,
): { interest: number; principal: number; fees: number; total: number } {
  const balance = Math.max(0, debt.balance);
  const rate = periodicRate(debt);
  const interest = round(balance * rate);
  const fees = round(Math.min(Math.max(0, debt.fees ?? 0), Math.max(0, requestedPayment - interest)));
  const total = round(Math.min(Math.max(0, requestedPayment), balance + interest + fees));
  const principal = round(Math.max(0, total - interest - fees));
  return { interest, principal, fees, total };
}

function projectDebt(debt: DebtAccount, payment: number, monthLimit = 1200): DebtProjection {
  let balance = Math.max(0, debt.balance);
  const steps: RepaymentStep[] = [];
  let totalInterest = 0;
  let totalPayments = 0;

  if (balance === 0) return { debtId: debt.id, payoffMonth: 0, totalInterest: 0, totalPayments: 0, steps: [] };
  if (payment <= 0) return { debtId: debt.id, payoffMonth: null, totalInterest: 0, totalPayments: 0, steps: [] };

  for (let month = 1; month <= monthLimit && balance > 0; month++) {
    const result = applyPayment(balance, payment, periodicRate(debt));
    totalInterest += result.interest;
    totalPayments += result.payment;
    steps.push({ month, debtId: debt.id, startingBalance: balance, interest: result.interest, payment: result.payment, endingBalance: result.endingBalance });
    balance = result.endingBalance;
  }

  return { debtId: debt.id, payoffMonth: balance === 0 ? steps.length : null, totalInterest: round(totalInterest), totalPayments: round(totalPayments), steps };
}

export function projectMinimumPayment(debt: DebtAccount): DebtProjection {
  return projectDebt(debt, debt.minimumPayment);
}

export function projectRepaymentScenario(debts: DebtAccount[], strategy: RepaymentScenario['strategy']): RepaymentScenario {
  const active = debts.filter(d => d.balance > 0);
  if (!active.length) return { strategy, payoffMonth: 0, totalInterest: 0, totalPayments: 0, order: [], projections: [] };

  const remaining = new Map(active.map(d => [d.id, Math.max(0, d.balance)]));
  const originalById = new Map(active.map(d => [d.id, d]));
  const projectionSteps = new Map<string, RepaymentStep[]>();
  const order: string[] = [];
  let totalInterest = 0;
  let totalPayments = 0;
  let month = 0;

  while (remaining.size && month < 1200) {
    month++;
    let freedPayment = 0;

    for (const [id, balance] of [...remaining.entries()]) {
      const debt = originalById.get(id)!;
      const interest = round(balance * periodicRate(debt));
      const minimum = Math.min(debt.minimumPayment, balance + interest);
      const ending = round(Math.max(0, balance + interest - minimum));
      const steps = projectionSteps.get(id) ?? [];
      steps.push({ month, debtId: id, startingBalance: balance, interest, payment: minimum, endingBalance: ending });
      projectionSteps.set(id, steps);
      totalInterest += interest;
      totalPayments += minimum;
      remaining.set(id, ending);
      if (ending === 0) {
        remaining.delete(id);
        freedPayment += minimum;
        if (!order.includes(id)) order.push(id);
      }
    }

    if (!remaining.size) break;

    if (strategy !== 'minimum' && freedPayment > 0) {
      const candidates = [...remaining.keys()].map(id => originalById.get(id)!);
      candidates.sort((a, b) => strategy === 'avalanche'
        ? (b.interestRate ?? 0) - (a.interestRate ?? 0) || a.id.localeCompare(b.id)
        : remaining.get(a.id)! - remaining.get(b.id)! || a.id.localeCompare(b.id));
      const target = candidates[0];
      const extra = Math.min(remaining.get(target.id)!, freedPayment);
      remaining.set(target.id, round(remaining.get(target.id)! - extra));
      totalPayments += extra;
      const last = projectionSteps.get(target.id)![projectionSteps.get(target.id)!.length - 1];
      last.payment = round(last.payment + extra);
      last.endingBalance = remaining.get(target.id)!;
      if (last.endingBalance === 0) {
        remaining.delete(target.id);
        if (!order.includes(target.id)) order.push(target.id);
      }
    }

    for (const [id, value] of remaining.entries()) if (value < 0.01) {
      remaining.delete(id);
      if (!order.includes(id)) order.push(id);
    }
  }

  const projections: DebtProjection[] = [...projectionSteps.entries()].map(([debtId, steps]) => ({
    debtId,
    payoffMonth: steps.length && steps[steps.length - 1].endingBalance === 0 ? steps.length : null,
    totalInterest: round(steps.reduce((s, x) => s + x.interest, 0)),
    totalPayments: round(steps.reduce((s, x) => s + x.payment, 0)),
    steps,
  }));

  return {
    strategy,
    payoffMonth: remaining.size ? null : month,
    totalInterest: round(totalInterest),
    totalPayments: round(totalPayments),
    order,
    projections,
  };
}
