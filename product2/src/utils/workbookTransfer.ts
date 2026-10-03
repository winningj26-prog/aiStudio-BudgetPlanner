import type { Product2Workbook } from '../domain/types.js';

export function exportProduct2Workbook(workbook: Product2Workbook): string {
  return JSON.stringify({ format: 'budgetplanner-product2', version: 1, workbook }, null, 2);
}

export function importProduct2Workbook(raw: string, accountId: string): Product2Workbook {
  const parsed: unknown = JSON.parse(raw);
  if (!parsed || typeof parsed !== 'object') throw new Error('Invalid Product 2 export.');
  const payload = parsed as { format?: unknown; version?: unknown; workbook?: unknown };
  if (payload.format !== 'budgetplanner-product2' || payload.version !== 1 || !payload.workbook || typeof payload.workbook !== 'object') {
    throw new Error('Unsupported Product 2 export format.');
  }
  const workbook = structuredClone(payload.workbook) as Product2Workbook;
  if (workbook.account?.id !== accountId) throw new Error('Import belongs to a different Product 2 account.');
  if (!Array.isArray(workbook.savingsGoals) || !Array.isArray(workbook.savingsContributions) || !Array.isArray(workbook.debts) || !Array.isArray(workbook.debtPayments)) {
    throw new Error('Product 2 export is missing required workbook collections.');
  }
  return workbook;
}
