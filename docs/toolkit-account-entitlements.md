# Toolkit account and entitlement contract

## Purpose

BudgetPlanner is the first application in a four-app toolkit. The toolkit
should use one account and one subscription rather than separate billing
systems inside each app.

The contract separates four concerns:

1. **Authentication** — identifies the user.
2. **Integrations** — records services the user has authorized, such as Google.
3. **Billing** — records the subscription and payment provider state.
4. **Entitlements** — determines which apps and features the account may use.

BudgetPlanner currently implements authentication with Firebase/Google and
stores its workbook locally. This document defines the boundary for the future
central account service without requiring a backend migration today.

## Canonical response

A future account service should expose a versioned response equivalent to:

```ts
interface ToolkitEntitlementResponse {
  version: 1;
  session: {
    user: {
      id: string;
      email: string | null;
      displayName: string | null;
      photoUrl: string | null;
    };
    subscription: {
      planId: 'free' | 'plus' | 'pro';
      status: 'active' | 'trialing' | 'past_due' | 'canceled' | 'incomplete';
      provider: 'monime' | 'none';
      currentPeriodEnd: string | null;
    };
    entitlements: {
      apps: Record<string, boolean>;
      features: Record<string, boolean>;
    };
  };
}
```

The exact transport/API path is intentionally deferred until the central
backend is selected.

## App identifiers

- `budget-planner`
- `app-2`
- `app-3`
- `app-4`

The final names for apps 2–4 should be assigned when those applications are
defined.

## BudgetPlanner feature identifiers

- `budget.core`
- `budget.localPersistence`
- `budget.export`
- `budget.googleSheets`
- `budget.aiInsights`
- `budget.advancedAnalytics`
- `budget.cloudSync`
- `budget.automation`

These identifiers are intentionally stable strings so the launcher and
applications do not need to understand billing-provider-specific details.

## Initial product model

| Plan | Core budgeting | Local data | Export | Google Sheets | AI | Advanced analytics | Cloud sync | Automation |
|---|---|---|---|---|---|---|---|---|
| Free | Yes | Yes | Yes | No | No | No | No | No |
| Plus | Yes | Yes | Yes | Yes | No | No | Yes | No |
| Pro | Yes | Yes | Yes | Yes | Yes | Yes | Yes | Yes |

This is a **working product contract**, not a final price or final cross-app
packaging decision. The other three applications may introduce additional
features and may require revising which features belong in each plan.

## Security rules

- Firebase/Google identity remains the authentication source until the
  central account system is introduced.
- Local storage must never be treated as proof of subscription or entitlement.
- A frontend entitlement flag is for UI/product behavior only.
- Paid API capabilities must be enforced server-side.
- Monime subscription state must be updated from verified webhooks; the billing layer remains the authority for paid access.
- Never trust a client-supplied `planId`, `isPremium`, or entitlement flag
  for authorization.
- Google OAuth access tokens must not be persisted in localStorage.
- Integration authorization is separate from subscription entitlement.

## Migration boundary

The next backend phase can implement these concepts with:

- `users/profiles`
- `plans`
- `subscriptions`
- `plan_entitlements`
- `app_entitlements`
- `integrations`
- `usage`

BudgetPlanner should continue working locally while this service is built.

## Toolkit launcher

The shared launcher is account-aware. BudgetPlanner is currently the only enabled
application; future app identifiers default to unavailable until their backend
app entitlement is explicitly enabled. This prevents placeholder apps from being
mistakenly exposed as production applications.
Only after the account service is validated should workbook cloud persistence
or subscription-gated features be switched to authoritative backend state.
