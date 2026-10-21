# Product 1 + Product 2 Merge Plan

Status: audit/planning only. No product code, routes, tables, or user records are deleted by this document.

## Architecture guardrails

- One platform authentication identity/profile per user.
- One shared Supabase database.
- Product 1 (BudgetPlanner) is the source of truth for financial accounts, cash flow, savings goals, debts, debt payments, net worth, and analytics after migration.
- Product 2 is disabled as an active app while its implementation and persisted records are preserved until migration is verified.
- Product 2's future replacement is a separate Financial Intelligence and Forecasting product. It must consume authorized Product 1 data rather than create a duplicate transaction ledger.
- Do not import Product 2 starter/demo records as real user financial history.
- Do not drop legacy tables until backup, migration reconciliation, and production acceptance are complete.

## Audit findings

- Product 1 already models savings goals, debts, debt payments, financial assets, recurring transactions, income and expenses in `src/types/budget.ts`.
- Product 1's `WorkbookData` in `src/services/workbookRepository.ts` persists `savingsGoals`, `debts`, `debtPayments`, `financialAssets`, cash opening balance and transaction ledgers.
- Product 1 already has a savings goals UI (`src/components/SavingsGoalsTracker.tsx`) and debt payoff worksheet (`src/components/worksheets/DebtPayoffSheet.tsx`), plus financial snapshot and analytics logic in `src/utils/financialModel.ts` and `src/components/worksheets/AdvancedAnalyticsSheet.tsx`.
- Product 1 debt payment model already records payment amount, principal, interest, debt ID and optional funding account ID. Current workbook validation expects amount = principal + interest.
- Product 2 currently has separate browser persistence and separate Supabase tables: `product2_settings`, `product2_savings_goals`, `product2_savings_contributions`, `product2_debt_accounts`, and `product2_debt_payments`.
- Product 2 is included in the main production build, served at `/product2/*`, exposed in the toolkit launcher, and included in app entitlement defaults/overrides.
- Product 2's empty-workbook starter dataset contains example goals, contributions, debt accounts and payments. This must be distinguished from genuine user data before migration.

## Field-by-field migration matrix

### Savings goals

| Product 2 field | Product 1 destination | Mapping rule / decision |
|---|---|---|
| `id` | `SavingsGoal.id` | Preserve ID when collision-free; otherwise retain source ID in migration audit mapping and generate a new destination ID. |
| `account_id` | Platform profile ownership / workbook owner | Resolve to the existing platform account. Reject rows whose owner cannot be resolved; never infer ownership from email alone. |
| `name` | `SavingsGoal.name` | Copy after trimming/validation. |
| `category` | `categoryName` and/or existing category model | Preserve original label. Map to a Product 1 category only when the mapping is unambiguous; otherwise keep a stable textual category. |
| `target_amount` | `targetAmount` | Validate finite and non-negative. |
| `opening_balance` | No direct field currently | Preserve as migration metadata until the destination model can represent it. Do not silently add it to current amount if contributions already include it. |
| `target_date` | `targetDate` | Preserve date or null. |
| `planned_contribution` | `monthlyContribution` | Copy only when the source frequency is monthly; preserve other frequencies in an extension field or defer until Product 1 supports them. |
| `contribution_frequency` | No direct field currently | Product 1 currently has monthly contribution only. Add explicit frequency support before importing non-monthly schedules; do not coerce weekly/biweekly/quarterly/yearly into monthly values. |
| `status` | Derived status / notes until status semantics align | Product 1 derives progress from current and target amounts. Preserve paused state as metadata rather than incorrectly treating it as completed. |
| `notes` | `notes` | Copy. |
| `account_id` (linked funding account) | `SavingsGoal.accountId` | Distinguish owner account from linked cash/bank account. Map only after resolving Product 1 financial asset/account IDs. |

### Savings contributions

| Product 2 field | Product 1 destination | Mapping rule / decision |
|---|---|---|
| `id` | New contribution ledger/event ID | Product 1 has a goal current amount but no dedicated persisted contribution ledger in the current workbook type. Add a first-class contribution model before migrating history. |
| `account_id` | Platform profile ownership | Preserve and verify ownership. |
| `goal_id` | `SavingsGoal.id` foreign key | Map through the goal ID crosswalk; orphan contributions are quarantined, not discarded. |
| `contribution_date` / `date` | Contribution event date | Preserve date. |
| `amount` | Contribution event amount | Validate finite and non-negative; establish explicit rules for withdrawals/reversals if supported. |
| `source`, `note` | Contribution event metadata | Preserve. |
| Derived sum | `SavingsGoal.currentAmount` | Reconcile opening balance + net contributions to current amount. Do not add both the current amount and contribution sum to the goal. Contributions are internal earmarks, not expenses or extra assets. |

### Debt accounts

| Product 2 field | Product 1 destination | Mapping rule / decision |
|---|---|---|
| `id` | `Debt.id` | Preserve ID when collision-free and keep a migration crosswalk. |
| `account_id` | Platform profile ownership | Verify owner. |
| `creditor` / `name` | `Debt.name` | Copy creditor/name. |
| `type` / `debt_type` | No dedicated Product 1 field currently | Add an optional debt classification field and validation before migrating types. Preserve unknown values as Other plus source metadata. |
| `opening_balance` / `original_balance` | `Debt.openingBalance` | Preserve as the starting liability balance. |
| `balance` / `current_balance` | `Debt.balance` | Reconcile with opening balance and principal payment ledger. Do not overwrite a ledger-derived balance without investigating differences. |
| `interest_rate` / `apr` | `Debt.interestRate` | Preserve percentage units; validate finite and non-negative. |
| `minimum_payment` | `Debt.minimumPayment` | Copy after validation. |
| `payment_frequency` | No direct field currently | Add explicit frequency support or preserve as metadata; do not assume all payment plans are monthly. |
| `fees` | No direct debt-level field currently | Preserve as debt metadata or model fee events separately. Do not conflate fees with principal. |
| `status` | Derived status / metadata | Recompute paid status from reconciled balance while preserving paused state. |
| `notes` | `Debt.notes` | Copy. |

### Debt payments

| Product 2 field | Product 1 destination | Mapping rule / decision |
|---|---|---|
| `id` | `DebtPayment.id` | Preserve ID when collision-free. |
| `account_id` | Platform profile ownership | Verify ownership. |
| `debt_id` | `DebtPayment.debtId` | Map through debt ID crosswalk; quarantine orphan payments. |
| `payment_date` / `date` | `DebtPayment.date` | Preserve date. |
| `amount` | `DebtPayment.amount` | Validate amount = principal + interest + fees according to the destination's explicit model. Current Product 1 model validates amount = principal + interest and has no payment fee field; extend model/validation before migrating payments with fees. |
| `principal_portion` / `principal` | `DebtPayment.principal` | Preserve principal component. |
| `interest_portion` / `interest` | `DebtPayment.interest` | Preserve interest component. |
| `fees` | No direct Product 1 payment field currently | Add payment fee support or preserve as separately auditable fee event before migration. Never silently drop it or classify it as principal. |
| `note` | `DebtPayment.notes` | Copy. |
| Funding account | `DebtPayment.accountId` | Product 2 does not currently guarantee a matching Product 1 cash/bank account link. Only link when an explicit source mapping exists; never guess the funding account. |

### Repayment planner and settings

| Product 2 data/behavior | Product 1 destination | Mapping rule / decision |
|---|---|---|
| Snowball strategy | Debt payoff worksheet | Reuse/align calculation behavior and tests. |
| Avalanche strategy | Debt payoff worksheet | Reuse/align calculation behavior and tests. |
| Extra monthly payment | Planner input only | Scenario parameter; never mutate actual debt or payment ledgers. |
| Projected payoff months / interest | Derived calculation output | Recompute using Product 1 debt inputs; don't migrate stale projections as authoritative balances. |
| Currency/date/interest convention/payment timing/minimum policy/decimal places | Product 1 settings or planner preferences | Map only where semantics match. Preserve unsupported preferences in migration metadata. |
| Product 2 dashboard/trend charts | Product 1 dashboard/analytics | Rebuild from the shared financial snapshot; do not migrate chart aggregates as source data. |

## File-level implementation change list

### Phase 0 — disable active Product 2, preserve data

1. `src/App.tsx`: remove the active Product 2 launcher callback/props wiring.
2. `src/components/ToolkitHomeView.tsx`: remove Product 2 from visible launcher entries; preserve other toolkit placeholder entries and account/plan behavior.
3. `src/types/toolkit.ts`: remove Product 2 from active app IDs only if no remaining API/client compatibility depends on the type. Prefer an explicit disabled-app registry or server-side deny over silently reusing the ID for a different app.
4. `server.ts`: remove the static bundle/SPA fallback for `/product2/*` and return a deliberate 404/410 disabled response. Remove Product 2 from default app access. Reject Product 2 in admin entitlement updates so overrides cannot re-enable it while disabled. Preserve audit logging and unrelated apps.
5. `package.json`: change root build to `vite build`; do not build Product 2 as part of the active production artifact.
6. `.github/workflows/v1-validation.yml`: keep validating the active Product 1 build and add a smoke assertion that `/product2/` is unavailable.
7. `.github/workflows/product2.yml`: disable the active-product CI workflow or reclassify it as legacy/migration-source validation. Do not delete Product 2 tests/source yet.
8. `PROJECT_CHECKLIST.md`: mark Product 2 as disabled/preserved and link this plan. Do not mark migration complete.
9. Tests: update launcher, entitlement, route and root-build expectations. Confirm admin app-access overrides cannot re-enable Product 2.

### Phase 1 — prepare Product 1 model and UI

1. `src/types/budget.ts`: add explicit savings contribution and required debt metadata fields (debt type, payment frequency, payment fees where required) using backward-compatible optional fields and documented units.
2. `src/services/workbookRepository.ts`: extend `WorkbookData` and defaults with a persisted savings contribution ledger and any necessary migration metadata; retain normalization for older workbooks.
3. `src/utils/workbookValidation.ts`: validate contribution/debt/payment invariants, account references, finite non-negative amounts, and fee-inclusive payment totals without breaking legacy workbooks.
4. `src/utils/financialPlanning.ts`: preserve goal progress behavior and add frequency-aware contribution planning where supported.
5. `src/utils/financialModel.ts`: keep contributions as internal earmarks; ensure debt principal, interest expenses, fees and cash-account movements each propagate exactly once.
6. `src/components/SavingsGoalsTracker.tsx`: add contribution history, dates/notes/source, opening-balance visibility and contribution-frequency controls; retain linked-account earmarking behavior.
7. `src/components/worksheets/DebtPayoffSheet.tsx`: align snowball/avalanche and extra-payment projections with Product 2 behavior; show assumptions and ensure scenarios do not write actual ledgers.
8. Debt-entry/payment UI components and `src/App.tsx`: add debt type/frequency/fee fields and payment fee handling, maintaining a single persisted debt-payment event.
9. `src/components/worksheets/AdvancedAnalyticsSheet.tsx` and dashboard: surface combined goal/debt metrics from the existing financial snapshot, not a parallel Product 2 workbook.
10. `test/acceptance.test.ts` plus focused unit tests: cover mapping, backward compatibility, ledger reconciliation and cross-module propagation.

### Phase 2 — data migration and cutover

1. Inventory all Product 2 Supabase tables, columns, constraints, foreign keys, RLS policies, indexes, row counts and per-profile ownership. Inspect local browser storage migration feasibility separately.
2. Back up source tables and produce a per-account row-count/balance report. Exclude known starter/demo fixtures unless confirmed to be user-authored.
3. Build an idempotent migration with a source-to-destination ID crosswalk, per-row error report, account ownership checks and duplicate detection.
4. Migrate goals, contributions, debts and payments in dependency order. Reconcile goal totals, debt opening/current balances, principal/interest/fees, and funding-account movements.
5. Run dry-run reports first; require zero unexplained differences before applying the production migration.
6. Keep legacy tables read-only through a verification window. Drop them only after explicit sign-off and verified backup/restore.

## Required acceptance gates

- Existing Product 1 authentication, onboarding, subscriptions, account-scoped storage, cloud sync, export and recurring transactions continue to pass.
- Product 2 is absent from the launcher, cannot be loaded directly, and cannot be enabled via entitlement override.
- A new user starts with blank real financial records; demo fixtures never enter their workbook.
- Contribution ledger sum + opening balance reconciles to each goal's current amount, with no duplicate cash asset or expense.
- Debt current balance reconciles to opening balance minus principal plus any explicitly modeled adjustments; interest and fees are not misclassified as principal.
- A real debt payment updates the debt, funding account, expense/fee ledger and net worth exactly once.
- Planner projections do not mutate actual balances or payments.
- Account A cannot read or migrate Account B records.
- Migration is idempotent; rerunning it does not duplicate records.
- Every source row is migrated, explicitly skipped as a verified demo/test fixture, or reported as a quarantined exception.
- Product 1 live acceptance passes before legacy Product 2 tables or source are removed.

## Known open questions to resolve during implementation

- Exact production schemas/row counts and whether any Product 2 users have real records.
- Product 2 browser-local records that never reached Supabase.
- How Product 2 opening savings balances relate to contribution history in existing real workbooks.
- Whether any Product 2 debt payments contain fees or use estimated interest; preserve the original source values and assumption metadata.
- Product 1 category storage and UI semantics for Product 2 goal/debt classifications.
- The exact active Product 1 UI locations for debt account CRUD/payment recording, to extend existing surfaces rather than create duplicates.
