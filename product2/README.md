# BudgetPlanner Product 2 — Savings Goal and Debt Tracker

Product 2 is a standalone application. It owns its own account/session boundary, persistence, workbook model, calculations, entitlements, and exports.

## Independence contract

Product 2 must not import or require Product 1 runtime modules, Product 1 storage keys, Product 1 workbook snapshots, Product 1 database rows, Product 1 APIs, or Product 1 entitlement/session state.

The browser foundation uses a Product 2-specific session key and Product 2-specific local persistence namespace. Production authentication and cloud persistence are intentionally separate follow-up infrastructure; they must use a separate Product 2 backend boundary rather than sharing Product 1 runtime state.

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
