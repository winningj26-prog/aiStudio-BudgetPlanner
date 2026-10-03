# BudgetPlanner Product 2 — Savings Goal and Debt Tracker

Product 2 is a standalone product domain inside the Toolkit multi-tenant platform. It owns its workbook model, calculations, product workflows, and exports while using a tenant-scoped persistence boundary.

## Independence contract

Product 2 must not import or require Product 1 runtime modules, Product 1 storage keys, Product 1 workbook snapshots, Product 1 database rows, Product 1 APIs, or Product 1 entitlement/session state.

The browser foundation uses a Product 2-specific session key and Product 2-specific local persistence namespace. Production authentication will resolve users to a Toolkit tenant, while Product 2 persistence remains tenant-scoped and product-specific. Product 2 does not require Product 1's runtime or data. A future physical database split remains possible without changing the Product 2 domain contract.

## Calculation assumptions

- Interest rates are nominal annual percentages converted to the debt's payment frequency.
- Payments occur at the end of each period.
- Configured minimum payments are used for minimum/snowball/avalanche projections.
- A missing interest rate is treated as 0% and is surfaced as an assumption.
- Payments cannot reduce a debt below zero.
- Existing fees are applied before principal in payment allocation.
- Completed savings goals cap displayed balance/progress at the target amount.
- Projection horizons are capped at 1,200 periods to prevent runaway calculations.

## Planned modules

1. Start Here
2. Settings
3. Savings Goals
4. Savings Contributions
5. Debt Accounts
6. Debt Payments
7. Repayment Planner
8. Dashboard


## Toolkit tenancy

Product 2 uses a tenant boundary rather than a product-specific database requirement. The current workbook model calls this identifier accountId; the Product2TenantContext abstraction makes its platform role explicit.

Initial infrastructure is intended to share the Toolkit Supabase project for cost efficiency, with strict tenant-scoped RLS and product-specific tables. Product 2 must remain portable so it can move to a separate database later if scale or operational requirements justify that split.
