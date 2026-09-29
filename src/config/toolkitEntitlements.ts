import {
  ToolkitEntitlements,
  ToolkitFeature,
  ToolkitPlanId,
} from '../types/toolkit';

/**
 * Initial product contract for the four-app toolkit.
 *
 * This is product configuration only, not a security boundary. Once billing
 * exists, the authoritative values must come from the account/entitlement
 * service and be enforced by backend APIs.
 */
const ALL_APPS = {
  'budget-planner': true,
  'app-2': true,
  'app-3': true,
  'app-4': true,
} as const;

const FEATURES: Record<ToolkitPlanId, ToolkitFeature[]> = {
  free: [
    'budget.core',
    'budget.localPersistence',
    'budget.export',
  ],
  plus: [
    'budget.core',
    'budget.localPersistence',
    'budget.export',
    'budget.googleSheets',
    'budget.cloudSync',
  ],
  pro: [
    'budget.core',
    'budget.localPersistence',
    'budget.export',
    'budget.googleSheets',
    'budget.aiInsights',
    'budget.advancedAnalytics',
    'budget.cloudSync',
    'budget.automation',
  ],
};

export const getDefaultToolkitEntitlements = (
  planId: ToolkitPlanId = 'free',
): ToolkitEntitlements => ({
  apps: { ...ALL_APPS },
  features: Object.fromEntries(
    FEATURES[planId].map((feature) => [feature, true]),
  ) as Partial<Record<ToolkitFeature, boolean>>,
});

export const TOOLKIT_PLAN_FEATURES = FEATURES;
