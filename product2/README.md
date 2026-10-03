# BudgetPlanner Product 2 — Savings Goal and Debt Tracker

Product 2 is an independent tool in the Toolkit. The platform provides one authenticated user account, one shared Supabase database, subscription state, and app entitlements. Product 2 owns its own domain model, UI, calculations, workflows, and persistence.

## Independence contract

Product 2 does not import or require Product 1 runtime modules, storage keys, workbook snapshots, database rows, APIs, calculations, or entitlement/session state.

Product 2 uses the existing Supabase Auth session from the platform and the shared /api/account/session contract. It does not implement a second login, create a Product 2 tenant, or manage a Product 2 subscription.

Its database rows are scoped directly to the shared platform profile through account_id. Product-specific tables remain isolated from Product 1 tables.

## Calculation assumptions

- Interest rates are nominal annual percentages converted to the debt's payment frequency.
- Payments occur at the end of each period.
- Configured minimum payments are used for minimum/snowball/avalanche projections.
- A missing interest rate is treated as 0% and is surfaced as an assumption.
- Payments cannot reduce a debt below zero.
- Existing fees are applied before principal in payment allocation.
- Completed savings goals cap displayed balance/progress at the target amount.
- Projection horizons are capped at 1,200 periods to prevent runaway calculations.

## Modules

1. Start Here
2. Settings
3. Savings Goals
4. Savings Contributions
5. Debt Accounts
6. Debt Payments
7. Repayment Planner
8. Dashboard

## Shared platform contract

- Authentication: shared Supabase Auth session.
- Account identity: shared Toolkit profiles.id.
- Subscription: shared Toolkit subscription service.
- Product access: shared Toolkit app entitlement.
- Database: shared Supabase project.
- Product data: Product 2 tables only.

Legacy tenant columns remain in the database solely for migration compatibility with data created by the previous architecture. New Product 2 runtime code uses account_id only.
