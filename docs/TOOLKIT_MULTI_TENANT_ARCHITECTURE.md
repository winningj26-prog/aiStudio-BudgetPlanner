# Toolkit shared-account / independent-product architecture

## Decision

Toolkit uses **one Supabase project, one platform account per user, and independent product tools**.

The Toolkit is the launcher and shared platform layer. It owns authentication, the authenticated user identity, the single platform account/profile, subscription and billing state, app entitlements, and shared platform services.

Each product is a peer tool. It owns its own domain UI, calculations, workflows, persistence tables, and repository boundary.

Conceptually:

    platform
       |
       +-- one authenticated user/account
       +-- one subscription/entitlement state
       +-- Product 1 — BudgetPlanner
       +-- Product 2 — Savings Goals & Debt
       +-- future Product 3
       +-- future Product 4

Products do not depend on one another.

## Product independence contract

A product must not require another product's UI/runtime, workbook state, browser storage namespace, database rows, API endpoints, calculations, authentication flow, or subscription flow.

A product may use shared platform services for identity, subscription/entitlements, and common infrastructure.

## Database strategy

There is one Supabase database.

Product 2 owns its own domain tables: product2_settings, product2_savings_goals, product2_savings_contributions, product2_debt_accounts, and product2_debt_payments.

Product 2 rows are scoped directly to the shared platform profiles.id through account_id. RLS maps account_id to the authenticated Supabase identity through profiles.auth_user_id.

The historical tenant_id columns and tenant tables are compatibility data from the earlier architecture. Product 2 runtime code no longer reads or writes those fields.

## Authentication

The platform is the only authentication owner.

When Product 2 is opened it reads the existing Supabase Auth session, asks the shared /api/account/session endpoint for the platform account and entitlement state, uses the returned platform profile id as its domain account scope, and returns unauthenticated users to the Toolkit sign-in/onboarding flow.

Product 2 never creates a second login or tenant.

## Subscription and entitlements

Subscription state belongs to the platform.

Product 2 does not create a Product 2 subscription, select a Product 2 plan, provision billing records, or decide the platform plan. The Toolkit account session supplies entitlements.apps.product2. Billing remains entirely in the shared platform layer.

## Product 2 domain boundary

Product 2 owns savings goals, contributions, debt accounts, debt payments, repayment calculations, and its settings. Its domain models use accountId to identify the shared platform account. This is a domain ownership key, not a Product 2 tenant.

Product 2 can therefore be developed, tested, deployed, or temporarily disabled without requiring Product 1 runtime or workbook state.

## Migration compatibility

Existing Product 2 tenant-scoped rows were migrated to account_id using the historical tenant owner's platform profile. Legacy tenant columns remain nullable compatibility fields so existing data and migration history remain safe. New Product 2 writes use only account_id.

## Validation contract

Acceptance coverage must prove that an authenticated Toolkit user can open Product 2 without another login; Product 2 does not provision a tenant or manage a subscription; Product 2 reads and writes only its own domain rows; Product 2 works without Product 1 runtime state; RLS prevents one platform user from accessing another user's Product 2 data; and direct Product 2 navigation respects the shared platform app entitlement.
