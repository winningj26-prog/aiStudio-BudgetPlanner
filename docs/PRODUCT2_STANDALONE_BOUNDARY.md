# Product 1 / Product 2 Standalone Boundary

## Decision
Product 1 (Personal Monthly Budget Planner) and Product 2 (Savings Goal and Debt Tracker) are independent applications. A user must be able to install, authenticate, use, persist, export, and operate either product without the other product being installed, running, or reachable.

Product 2 may reuse proven financial-model concepts and implementation patterns from Product 1, but it must own its own application boundary and data required for its own operation.

## Product 2 ownership
- Savings goals and contributions.
- Debt accounts and balances.
- Debt payments.
- Interest calculations.
- Payoff projections.
- Snowball and avalanche planning.
- Repayment scenarios.
- Product 2 dashboard and reporting.
- Product 2 workbook/export format.
- Product 2 validation, sample data, assumptions, and acceptance tests.

The existing Product 1 Debt Payoff implementation is the starting implementation asset for Product 2. It should be migrated/adapted, not duplicated as a second debt engine.

## Independence requirements
Product 2 must NOT require:
- Product 1 frontend or runtime.
- Product 1 local-storage namespace.
- Product 1 workbook/snapshot to exist.
- Product 1 database tables or rows at runtime.
- Product 1 entitlement/session state at runtime.
- Product 1 API endpoints at runtime.
- Product 1 being deployed or online.

If Product 2 imports or exports data with Product 1 in the future, that integration must be an optional adapter/API/file-transfer feature. It must never be a runtime prerequisite for core Product 2 functionality.

## Shared concepts versus shared runtime dependencies
Allowed:
- Shared design-system conventions.
- Shared calculation patterns after independent verification.
- Shared TypeScript utility patterns copied/adapted into Product 2.
- Shared documentation standards.
- Compatible import/export formats.

Not allowed as a Product 2 dependency:
- Direct imports from Product 1 application components at runtime.
- Direct reads/writes of Product 1 workbook storage.
- Direct dependence on Product 1 authentication state.
- Direct dependence on Product 1 subscription/entitlement state.
- Direct dependence on Product 1 cloud workbook snapshots.

## Debt Payoff migration rule
The current Product 1 Debt Payoff implementation, including its Debt and DebtPayment models and supporting financial-planning calculations, is treated as a migration asset for Product 2. Before Product 2 release, the debt engine must have an independent Product 2 implementation boundary and its own tests.

Product 1 must remain operational after the migration decision. Existing Product 1 debt-related financial propagation must not be broken merely because Product 2 becomes the product owner of the debt-planning experience.

## Product 2 minimum standalone acceptance
1. Create a new Product 2 account/session.
2. Enter savings goals without Product 1 data.
3. Enter debts without Product 1 data.
4. Record debt payments without Product 1 data.
5. Calculate interest and payoff projections without Product 1 data.
6. Run snowball and avalanche scenarios without Product 1 data.
7. Persist and reload Product 2 data independently.
8. Export Product 2 data independently.
9. Start with an empty Product 2 workbook and still operate correctly.
10. Continue operating if Product 1 is unavailable.

## Current status
This is an architecture/scope decision, not Product 2 implementation approval. Product 2 implementation remains gated by the project's formal product-approval process. No runtime dependency on Product 1 should be introduced while preparing Product 2.