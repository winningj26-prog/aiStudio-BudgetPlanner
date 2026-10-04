# Product 2 Standalone Architecture

## Status

**Phase:** Architecture / Phase 2  
**Product:** Savings Goal and Debt Tracker  
**Implementation status:** Not started  
**Approval status:** Pending explicit architecture approval  
**Relationship to Product 1:** Independent application; no runtime dependency

## 1. Application boundary

Product 2 is a standalone full-stack application.

It owns:

- its frontend and navigation;
- its authentication/session lifecycle;
- its onboarding flow;
- its subscription/entitlement state, if monetized;
- its workbook/data repository;
- its cloud persistence;
- its local/offline persistence, if supported;
- its savings-goal domain;
- its debt-account domain;
- its debt-payment domain;
- its interest and payoff calculations;
- its repayment-planning scenarios;
- its dashboard/reporting;
- its export/import formats;
- its validation and acceptance tests.

Product 2 must continue to function if Product 1 is stopped, deleted, redeployed, logged out, or otherwise unavailable.

### Explicitly prohibited runtime dependencies

Product 2 must not:

- import Product 1 React/application components at runtime;
- read Product 1 local-storage keys;
- read or write Product 1 workbook snapshots;
- query Product 1 database tables or rows;
- use Product 1 authentication/session state;
- use Product 1 entitlement state to authorize Product 2;
- call Product 1 API endpoints for core calculations or persistence;
- require the Product 1 deployment to be reachable.

Any future Product 1 ↔ Product 2 integration is optional and must be implemented as a versioned file/API adapter with an explicit import/export boundary.

## 2. Product 2 navigation and modules

Initial application shell:

1. Start Here
2. Settings
3. Savings Goals
4. Savings Contributions
5. Debt Accounts
6. Debt Payments
7. Repayment Planner
8. Dashboard

### Start Here

Purpose:

- establish the user's currency/date assumptions;
- explain that payoff projections are estimates;
- collect initial savings/debt information;
- provide navigation into the core workflow.

The user must be able to complete setup with an empty workbook.

### Settings

Own Product 2 settings:

- currency;
- date format;
- interest-rate convention;
- payment timing assumption;
- default minimum-payment behavior;
- optional fees/charges assumptions;
- calculation/display preferences.

Settings are Product 2 data and are not inherited from Product 1.

### Savings Goals

Own:

- goal name;
- target amount;
- opening balance;
- target date;
- contribution frequency;
- planned contribution;
- status;
- notes.

Required calculated outputs include current balance, remaining amount, completion percentage, and projected completion where sufficient inputs exist.

### Savings Contributions

Own transaction-level contributions:

- contribution date;
- goal;
- amount;
- account/source description if supported;
- note.

Contribution history must update goal balances without requiring Product 1 transaction data.

### Debt Accounts

Own:

- creditor/name;
- opening balance;
- current balance;
- interest rate;
- minimum payment;
- payment frequency;
- optional fees;
- status;
- notes.

The debt account model must support zero balances and missing/unknown interest rates without producing misleading calculations.

### Debt Payments

Own transaction-level payments:

- payment date;
- debt account;
- amount;
- principal;
- interest;
- fees, if applicable;
- note.

Payment allocation rules must be explicit. Where the user does not provide a principal/interest split, Product 2 calculates it from the documented assumptions.

### Repayment Planner

Own:

- minimum-payment baseline;
- snowball scenario;
- avalanche scenario;
- side-by-side scenario comparison;
- payoff date/month;
- total interest;
- total payments;
- estimated payment count;
- debt-by-debt payoff order.

Scenarios are calculations over Product 2 debt data only.

### Dashboard

Own summary/reporting for:

- total savings goal balance and remaining target;
- total debt balance;
- total planned/minimum debt payments;
- projected payoff results;
- interest estimates;
- snowball/avalanche comparison;
- completed goals;
- zero-balance debts.

Dashboard values must derive from Product 2's own persisted state.

## 3. Standalone data model

The initial logical model is:

### Product2Account

- id
- user/session ownership key
- display name
- currency
- createdAt
- updatedAt

### SavingsGoal

- id
- accountId
- name
- targetAmount
- openingBalance
- targetDate
- contributionFrequency
- plannedContribution
- status
- notes

### SavingsContribution

- id
- accountId
- goalId
- date
- amount
- source
- note

### DebtAccount

- id
- accountId
- creditor
- openingBalance
- balance
- interestRate
- minimumPayment
- paymentFrequency
- fees
- status
- notes

### DebtPayment

- id
- accountId
- debtId
- date
- amount
- principal
- interest
- fees
- note

### Product2Settings

- accountId
- currency
- dateFormat
- interestConvention
- paymentTiming
- minimumPaymentPolicy
- calculationPreferences

The physical database schema may differ, but every exposed table must remain account-scoped and protected by the Product 2 authorization boundary.

## 4. Persistence boundary

Product 2 gets its own repository abstraction.

Example conceptual interface:

- create/load account workbook;
- save workbook;
- update savings goals;
- append/edit/delete contributions;
- create/update/delete debt accounts;
- append/edit/delete debt payments;
- load settings;
- export workbook;
- import a compatible Product 2 file.

The implementation may use local persistence, cloud persistence, or both, but all persistence belongs to Product 2.

No repository method may reach into Product 1 storage.

## 5. Calculation boundary

Financial calculations must be pure Product 2 domain functions where practical.

Required calculation areas:

- savings goal progress;
- contribution aggregation;
- projected goal completion;
- periodic interest;
- payment allocation;
- debt balance amortization;
- minimum-payment payoff projection;
- snowball projection;
- avalanche projection;
- scenario comparison;
- zero-balance handling;
- missing-interest-rate handling;
- overpayment handling;
- completed-goal handling.

The calculation layer must not depend on React components, browser storage, Product 1 modules, authentication, or network calls.

### Debt-engine migration rule

Product 1's existing debt-payoff implementation is the reference implementation and migration asset.

Product 2 should adapt the proven formulas and edge-case behavior into its own domain module and test suite. It must not import Product 1's debt components or service modules at runtime.

Product 1 keeps its existing implementation until Product 2 has an independently verified replacement. This avoids breaking Product 1 during migration.

## 6. Authentication and authorization

Product 2 owns its account/session lifecycle.

Supported sign-in methods are a Product 2 configuration decision; Product 2 must not assume that Product 1's provider configuration exists.

Authorization must be based on Product 2's authenticated identity/account ownership.

Subscription/entitlement checks, if required, are Product 2 concerns. Product 2 must not call Product 1 to determine whether a user can access a Product 2 feature.

## 7. Optional interoperability

Interoperability is deliberately outside the core runtime path.

Future adapters may support:

- Product 1 export → Product 2 import;
- Product 2 export → Product 1 import;
- neutral CSV/JSON transfer;
- versioned API integration.

Adapters must:

- validate imported data;
- identify source/version;
- never overwrite data silently;
- preserve Product 2 ownership;
- work when the source application is offline after the export file has been obtained.

## 8. Compatibility and financial assumptions

The architecture must explicitly document:

- currency handling;
- date conventions;
- interest-rate convention;
- compounding period;
- payment timing;
- minimum-payment rules;
- fee treatment;
- rounding;
- overpayment behavior;
- zero-balance behavior;
- missing-interest-rate behavior.

Excel/Google Sheets compatibility requirements from the original product specification remain relevant to Product 2's export/import representation. The application itself is not required to execute inside either spreadsheet platform.

## 9. Acceptance gates before implementation approval

Architecture approval requires these decisions to be explicit:

- application boundary;
- authentication boundary;
- persistence boundary;
- data model;
- calculation assumptions;
- debt payment allocation rules;
- savings projection rules;
- scenario definitions;
- export/import format;
- validation behavior;
- compatibility strategy;
- acceptance-test plan.

## 10. Standalone acceptance tests

At minimum:

1. New Product 2 account can be created without Product 1.
2. Product 2 can start with an empty dataset.
3. Savings goal can be created, edited, completed, and recalculated.
4. Contributions update only the selected goal.
5. Debt can be created with valid balances/rates/payment terms.
6. Debt can be created with a zero balance.
7. Debt with an unknown interest rate is handled explicitly.
8. Debt payment reduces the correct debt and records the transaction.
9. Overpayment cannot produce an invalid negative balance.
10. Interest calculation follows the documented convention.
11. Minimum-payment projection produces deterministic results.
12. Snowball projection produces deterministic results.
13. Avalanche projection produces deterministic results.
14. Side-by-side scenarios use the same starting debt state.
15. Product 2 persists and reloads without Product 1.
16. Product 2 export works without Product 1.
17. Product 2 continues to operate when Product 1 is unreachable.
18. Account A cannot read Account B's Product 2 data.
19. Product 2 auth/session state is independent of Product 1.
20. Product 2 entitlement state is independent of Product 1.

## 11. Implementation sequence after approval

1. Create/confirm the standalone Product 2 application boundary.
2. Implement Product 2 auth/session and account ownership.
3. Implement Product 2 repository and persistence.
4. Implement domain models and validation.
5. Port/adapt savings-goal calculations.
6. Port/adapt debt calculations from the Product 1 migration asset.
7. Implement debt payments and allocation.
8. Implement repayment scenarios.
9. Implement workbook/export format.
10. Build the eight-module UI.
11. Add acceptance tests for each module.
12. Add cross-account isolation tests.
13. Add standalone/offline-from-Product-1 tests.
14. Run implementation approval gate before release testing.

## 12. Current decision

**Decision:** Product 2 is architected as an independent application.

**Migration approach:** Adapt the existing Product 1 debt engine into Product 2; do not create a second runtime dependency.

**Product 1 safety rule:** Product 1 remains independently operational until Product 2's replacement debt functionality is verified.

**Implementation:** Blocked pending explicit approval of this architecture under the project's Phase 2/implementation approval process.
