import type { ToolkitPlanId } from '../types/toolkit';

const MAX_DISPLAY_NAME_LENGTH = 80;

export const TOOLKIT_ONBOARDING_PLANS: readonly ToolkitPlanId[] = ['free', 'plus', 'pro'];

export function normalizeDisplayName(value: unknown): string {
  if (typeof value !== 'string') return '';
  return value.trim().replace(/\s+/g, ' ').slice(0, MAX_DISPLAY_NAME_LENGTH);
}

export function isToolkitPlanId(value: unknown): value is ToolkitPlanId {
  return typeof value === 'string' && TOOLKIT_ONBOARDING_PLANS.includes(value as ToolkitPlanId);
}
