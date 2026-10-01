export const BILLING_PLAN_IDS = ['plus', 'pro'] as const;

export type BillingPlanId = (typeof BILLING_PLAN_IDS)[number];

export const isValidBillingPlanId = (value: unknown): value is BillingPlanId =>
  typeof value === 'string' && (BILLING_PLAN_IDS as readonly string[]).includes(value);

export const isValidBillingAmount = (value: unknown): value is number =>
  typeof value === 'number'
  && Number.isFinite(value)
  && value > 0
  && Math.round(value * 100) === value * 100;

export const normalizeTransactionId = (value: unknown): string | null => {
  if (typeof value !== 'string') return null;
  const normalized = value.trim();
  return normalized.length > 0 && normalized.length <= 120 ? normalized : null;
};

export const normalizeOptionalText = (value: unknown, maxLength: number): string | null => {
  if (value == null || value === '') return null;
  if (typeof value !== 'string') return null;
  const normalized = value.trim();
  if (!normalized) return null;
  return normalized.length <= maxLength ? normalized : null;
};
