# Central account backend foundation

## Architecture
The four applications should consume a central account service rather than maintaining independent billing or subscription state.

The account service owns:
- user profile identity
- subscription state
- plan definitions
- feature entitlements
- per-app access
- external integration records
- metered usage

BudgetPlanner remains responsible for its own workbook domain.

## Authentication boundary
Firebase/Google remains the current authentication mechanism in BudgetPlanner. The future account service should map the authenticated provider identity to a single internal user ID.

Authentication answers **who is this user?** It does not answer which plan they have or which app/features they can use.

## Billing boundary
Stripe should be the payment provider when billing is introduced.

The browser must never be the authority for subscription state. Stripe webhooks should update the subscription record after signature verification. The account service then derives effective entitlements.

The frontend may receive entitlement data for UI purposes, but paid API operations must verify the authoritative entitlement server-side.

## Data boundaries
- **profiles:** one row per toolkit account.
- **plans:** stable product plans such as free, plus, and pro.
- **plan_entitlements:** maps a plan to stable feature keys.
- **subscriptions:** stores provider-backed subscription state and reconciliation IDs.
- **app_entitlements:** allows explicit per-account app access without coupling application code to Stripe product IDs.
- **integrations:** records authorization to external services such as Google Sheets; this is separate from subscription access.
- **usage:** stores metered quantities such as AI requests; usage should be checked and incremented server-side.

## Row-level security
When this schema is deployed to Supabase, enable RLS on all user-owned tables and create policies based on the authenticated user's internal identity.

Service-role operations such as Stripe webhook processing must run only on trusted server infrastructure and must never expose the service-role key to the browser.

## Deliberately deferred
This migration does not move BudgetPlanner localStorage data, replace Firebase authentication, introduce Stripe, create a second login flow, enable cloud sync, or gate existing production features.

Those changes should happen only after the account service is deployed and tested independently.