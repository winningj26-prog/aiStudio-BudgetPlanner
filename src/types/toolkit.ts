/**
 * Shared account/entitlement contract for the future four-app toolkit.
 *
 * This module is deliberately provider-agnostic. It defines the shape that
 * BudgetPlanner can consume now and that a future central account service can
 * return later. It is not an authorization mechanism by itself.
 */

export const TOOLKIT_APP_IDS = [
  'budget-planner',
  'app-2',
  'app-3',
  'app-4',
] as const;

export type ToolkitAppId = (typeof TOOLKIT_APP_IDS)[number];

export const TOOLKIT_PLAN_IDS = [
  'free',
  'plus',
  'pro',
] as const;

export type ToolkitPlanId = (typeof TOOLKIT_PLAN_IDS)[number];

export type ToolkitFeature =
  | 'budget.core'
  | 'budget.localPersistence'
  | 'budget.export'
  | 'budget.googleSheets'
  | 'budget.aiInsights'
  | 'budget.advancedAnalytics'
  | 'budget.cloudSync'
  | 'budget.automation';

export interface ToolkitUser {
  id: string;
  email: string | null;
  displayName: string | null;
  photoUrl: string | null;
  onboardingComplete: boolean;
}

export interface ToolkitSubscription {
  planId: ToolkitPlanId;
  status: 'active' | 'trialing' | 'past_due' | 'canceled' | 'incomplete';
  provider: 'monime' | 'mobile_money' | 'none';
  currentPeriodEnd: string | null;
  selectedAt?: string | null;
}

export interface ToolkitEntitlements {
  apps: Partial<Record<ToolkitAppId, boolean>>;
  features: Partial<Record<ToolkitFeature, boolean>>;
}

export interface ToolkitSession {
  user: ToolkitUser;
  subscription: ToolkitSubscription;
  entitlements: ToolkitEntitlements;
}

export interface ToolkitEntitlementResponse {
  version: 1;
  session: ToolkitSession;
}

/**
 * Small helper for app-level feature checks.
 *
 * The frontend may use this to shape UI, but a future backend must enforce
 * paid feature access server-side as well.
 */
export const hasToolkitFeature = (
  entitlements: ToolkitEntitlements | null | undefined,
  feature: ToolkitFeature,
): boolean => Boolean(entitlements?.features[feature]);

export const hasToolkitAppAccess = (
  entitlements: ToolkitEntitlements | null | undefined,
  appId: ToolkitAppId,
): boolean => Boolean(entitlements?.apps[appId]);
