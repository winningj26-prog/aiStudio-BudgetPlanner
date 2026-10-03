# BudgetPlanner V1 Checklist

Updated after each completed implementation/verification task.

## A. Core V1 / stability
- [x] Authentication/session persistence
- [x] Account-scoped local storage
- [x] Workbook repository abstraction
- [x] Cloud persistence foundation
- [x] Cloud endpoint authorization/data-path review
- [x] Cloud workbook payload validation hardened and covered by acceptance contract test
- [x] Render deployment
- [x] Google Sheets foundation
- [x] Gemini integration foundation
- [ ] Final edge-case/error handling pass
- [ ] Final production acceptance testing

## B. Entitlements
- [x] cloudSync Plus/Pro
- [x] Free local-only
- [x] Server-side enforcement
- [ ] Actual cloud save/load test
- [ ] Entitlement change testing
- [ ] Paid → Free downgrade testing
- [x] Entitlement matrix documented

## C. Paid features
- [x] AI Insights foundation/enforcement/usage tracking
- [x] AI Insights authenticated request + Pro UI gating
- [ ] AI UI acceptance testing
- [x] Advanced Analytics + gating
- [x] Free/Plus/Pro acceptance testing (automated entitlement coverage; V1 validation #204 passed)

## D. Toolkit/account
- [x] Shared account schema
- [x] Supabase identity bridge
- [x] Subscription/entitlement foundation
- [x] Account-scoped storage
- [x] Workbook repository
- [x] Toolkit homepage/app launcher
- [x] App access entitlement model
- [x] Architecture for Apps 2–4
- [x] User onboarding foundation
- [x] Paid onboarding completion hardened
- [x] Subscription management/upgrade UI
- [x] Manual Mobile Money billing workflow
- [x] Platform configuration dashboard
- [x] Platform configuration schema
- [x] Vault secret storage foundation
- [x] Platform admin authorization
- [x] Admin account lifecycle hardening (Auth email sync, delete, suspension preservation)
- [x] Admin user account overrides with required reason/audit
- [x] Platform security health dashboard
- [ ] Actual Mobile Money provider/account configuration

## E. Authentication
- [x] Email/password sign-in
- [x] Email/password sign-up
- [x] Google OAuth
- [x] Password reset
- [x] Password recovery UI
- [x] Email confirmation flow protected from link prefetch
- [ ] Production email domain/SMTP
- [ ] Re-enable/test email confirmation after domain setup
- [ ] Production auth acceptance pass

## F. Billing
- [x] Plus/Pro subscription model
- [x] Decimal currency pricing support (up to 2 decimals)
- [x] Mobile Money submit/review/approval state machine
- [x] Paid onboarding activation after confirmed payment
- [ ] End-to-end real Mobile Money payment test
- [ ] Paid → Free downgrade test
- [x] Billing edge-case/error pass (centralized plan/amount/text validation and billing configuration error handling)
- [x] Monime integration explicitly deferred

## G. Production security
- [x] Protected tables use RLS
- [x] Browser uses Supabase publishable key
- [x] Server-only privileged Supabase access
- [x] Platform secrets kept out of browser responses
- [x] Supabase Security Advisor reviewed (2026-10-01, reverified 2026-10-01)
- [ ] Enable leaked-password protection if available on current Supabase plan
- [x] Final admin authorization/audit review (server-side admin allow-list + privileged access + audit paths reviewed; Supabase public policy inventory verified empty with RLS enabled)
- [ ] Rotate/remove temporary test credentials
- [ ] Production auth/email security review

## H. Acceptance coverage
- [x] Storage namespacing tests
- [x] Legacy storage migration tests
- [x] Local workbook repository round-trip test
- [x] Free/Plus/Pro entitlement helper tests
- [x] Mobile Money state transition test
- [x] Decimal billing acceptance tests
- [x] Manual billing input edge-case acceptance coverage
- [x] Cloud save/load acceptance test
- [x] Cloud save payload shape acceptance coverage
- [x] AI Insights acceptance test
- [x] Advanced Analytics acceptance test
- [x] Google Sheets create/read/write acceptance test
- [x] Admin/non-admin acceptance test (authorization allow-list coverage; V1 validation #213 passed)
- [ ] Admin account edit/suspend/delete live acceptance test
- [x] Auth/session acceptance test (signed-in/signed-out session-state contract; V1 validation #209 passed)
- [ ] Full production smoke/acceptance pass

- [x] V1 validation TypeScript blocker fixed (duplicate auth import)
- [x] V1 validation pipeline passed (#200)
- [x] Auth/session acceptance coverage verified in V1 validation #209
- [x] AI production hardening merged to main
- [x] AI production hardening deployed and verified live
- [x] Latest main acceptance changes deployed to Render and reached live (`dep-dav81ibtqb8s739jrjlg`)
- [x] Latest security-review checklist commit deployed to Render and reached live (`dep-dav82is9v7es73fh37b0`)
- [x] AI Insights UI Pro entitlement gate implemented and production build deployed live (`dep-dav875u7bikc73f4j2m0`)
- [x] AI Insights UI acceptance contract test added; full test execution remains pending because the execution environment cannot resolve GitHub
- [x] Billing edge-case hardening deployed and verified live (`dep-davaene0tbcc73aqi9ig`)

## Current blocker / dependency
- Real Mobile Money verification requires the user's actual provider/account details.
- Production auth email confirmation requires an owned sending domain/custom SMTP.
- Current Supabase Security Advisor warning: leaked-password protection is disabled. Current Supabase documentation says this feature is available on Pro and above.
- Admin lifecycle hardening is implemented; live admin edit/suspend/delete acceptance remains pending.
- Cloud save/load still needs a real authenticated Plus/Pro session test; outbound DNS is unavailable in this execution environment, so live HTTP smoke testing could not be performed here.

## Latest verification
- V1 validation pipeline #200: passed (user-reported).
- AI production hardening merged to main as `5ff118ac6389a88fb93a09af21b2e350a2dfec21`.
- Render deploy `dep-dav7nvfpn0mc73aitk00` reached `live` for the merged main commit; post-deploy log query was attempted but Render's log backend returned a temporary 503.
- Supabase project status: ACTIVE_HEALTHY
- Postgres: 17.6.1
- Security Advisor: intentional RLS notices plus leaked-password protection warning; no unexpected public-access finding.
- Cloud API path reviewed: authenticated request → Supabase identity → account profile → cloudSync entitlement → account-scoped workbook snapshot.

## I. Module review
- [x] Accounts & onboarding implementation review completed
- [x] Onboarding subscription prices now load from server billing configuration
- [x] Accounts & onboarding server input hardening (display-name validation and exact email identity matching)
- [x] Accounts & onboarding session-refresh failure handling
- [x] Accounts & onboarding live acceptance: new Free account
- [x] Accounts & onboarding live acceptance: paid onboarding through payment approval
- [x] Accounts & onboarding live acceptance: returning account/session restoration
- [x] Accounts & onboarding live acceptance: account suspension/deletion boundaries


## J. Module 3 — Subscription & Entitlements
- [x] Free / Plus / Pro entitlement matrix reviewed against live Supabase plan_entitlements
- [x] Server-side paid-feature enforcement reviewed for cloud sync and AI Insights
- [x] Expired subscriptions fail closed to Free entitlement behavior
- [x] Suspended subscription state aligned across application type, server session, and database constraint
- [x] Suspended accounts fail closed for app and feature entitlements
- [x] Free downgrade server action implemented
- [x] Subscription UI loads Plus/Pro prices from server billing configuration
- [x] Subscription entitlement acceptance contract extended for suspended accounts
- [ ] Subscription & entitlements live acceptance: Plus → Free downgrade
- [ ] Subscription & entitlements live acceptance: expired paid subscription → Free behavior
- [ ] Subscription & entitlements live acceptance: suspended account access boundary
- [ ] Subscription & entitlements live acceptance: Plus/Pro feature access matrix with real accounts
- [x] Module 3 entitlement hardening deployed to Render and reached live (`dep-davbm7ndjqhc73efeag0`)
- [x] Suspended subscription database constraint applied and verified live (Supabase migration `20261001195701`)
- [x] Subscription & entitlements live validation compile blocker fixed (stale `plans` reference in `OnboardingView.tsx`)
- [x] V1 validation pipeline passed after Module 3 hardening (#252)

## K. Quick fixes — account suspension & payment configuration
- [x] Account suspension is separate from subscription suspension
- [x] Suspended accounts are blocked from Toolkit access after authentication and shown an administrator contact notice
- [x] Platform admin can configure suspension support email and phone
- [x] Platform admin can enable/disable Mobile Money, Monime, and future Bank Transfer payment methods
- [x] Platform admin can configure multiple Mobile Money providers with provider-specific account details and instructions
- [x] Users can select an enabled Mobile Money provider before submitting payment
- [x] Monime checkout respects the platform payment-method configuration
- [x] V1 validation passed after the quick fixes (#275)
- [x] Supabase schema verified for account suspension and payment configuration fields
- [x] Suspension and payment configuration fixes deployed to Render and reached live (`dep-davcca3m8hqs73bt34pg`)


## L. Module 4 — Budget / Workbook
- [x] Workbook data model and repository boundary reviewed
- [x] Account-scoped local workbook persistence reviewed
- [x] Local workbook round-trip acceptance coverage reviewed
- [x] Cloud workbook authorization and account-derived persistence path reviewed
- [x] Workbook calculations and annual summary formulas reviewed
- [x] Workbook export paths reviewed for Excel, CSV, and JSON backup
- [x] Workbook snapshot schema validation added for settings, ledgers, budgets, goals, debts, recurring rules, and navigation state
- [x] Invalid local workbook snapshots now fall back to trusted defaults
- [x] Invalid cloud workbook snapshots now fall back to the trusted local workbook before hydration
- [x] Cloud workbook writes reject malformed or invalid workbook snapshots server-side
- [x] Final workbook validation edge cases hardened for impossible dates, blank payment methods, and malformed linked account IDs (PR #67; live `dep-db05iv2vcj2c7390lllg`)
- [x] Module 4 acceptance coverage added for malformed workbook data and safe fallback behavior
- [x] Transaction editors reviewed for positive-amount enforcement and stable edit/delete behavior
- [x] Income and expense transaction editors reject non-finite amounts such as Infinity
- [x] Income and expense category aggregation reviewed for case/whitespace normalization
- [x] Budget variance/status logic reviewed for income targets, expense limits, and zero-plan edge cases
- [x] Annual summary grouping reviewed across calendar-year boundaries
- [x] Export budget calculations aligned with the workbook's category-name budget keys
- [x] Module 4 transaction and budget calculation acceptance tests added
- [x] Module 4 formula aggregations ignore non-finite/negative transaction amounts and invalid budget numeric inputs
- [x] Savings goal progress calculations hardened for zero/oversaved/invalid-value edge cases
- [x] Savings goal contributions reject zero, negative, and non-finite amounts
- [x] Debt interest, minimum-payment shortfall, and payoff edge cases covered by acceptance tests
- [x] Recurring transaction posting now honors monthly, weekly, bi-weekly, and yearly frequencies
- [x] Recurring transaction date generation clamps day-of-month safely to shorter months
- [x] Module 4 savings goals, debts, and recurring transaction acceptance tests added
- [ ] Module 4 live acceptance: create/edit/delete income and expense transactions
- [ ] Module 4 live acceptance: monthly budget planning and variance calculations
- [ ] Module 4 live acceptance: savings goals, debts, and recurring transactions
- [ ] Module 4 live acceptance: account switching preserves workbook isolation
- [ ] Module 4 live acceptance: Plus/Pro cloud save/load round-trip
- [ ] Module 4 live acceptance: export/download verification
- [x] Module 4 TypeScript validation blocker fixed (`workbookValidation.ts` unknown `dayOfMonth`/`year` narrowing)
- [x] Module 4 production validation pipeline (V1 validation run #292 passed TypeScript, acceptance tests, production build, production smoke, Docker build, and Docker smoke)
- [x] Module 4 deployment verification (`dep-davf8gvdjqhc73ei9hjg`, latest validated commit live)

## M. Cross-module financial model
- [x] Income and expense transactions remain the source of actual cash-flow data used by budget and analytics
- [x] Shared financial snapshot now connects income, expenses, savings goals, debts, assets, cash, and net worth
- [x] Net Worth now recalculates from shared cash flow and debt state instead of isolated/hardcoded balances
- [x] Financial assets and opening cash balance are account-scoped and included in local/cloud workbook persistence
- [x] Savings goal allocations are treated as internal cash earmarks rather than duplicated expenses
- [x] Advanced Analytics now consumes the same shared financial snapshot as Net Worth
- [x] Cross-module financial propagation acceptance tests added
- [x] V1 validation run #317 passed TypeScript, acceptance tests, production build, production smoke, Docker build, and Docker smoke
- [x] Cross-module financial model deployed to Render and reached live (`dep-davdviqdails738n7ueg`)
- [ ] Live acceptance: change income/expense and verify budget, dashboard, analytics, and net worth update together
- [ ] Live acceptance: change debt balance/payoff data and verify liabilities and net worth update together
- [ ] Live acceptance: change savings goal allocation and verify available cash/goal totals remain consistent
- [ ] Live acceptance: edit assets/opening cash and verify net worth and persistence update together

## N. Starting Financial Position
- [x] New users start with a blank financial position instead of fabricated cash, property, investments, or other wealth
- [x] Financial assets support pre-existing categories including vehicles, businesses, retirement, receivables, property, and investments
- [x] Financial assets can retain an explicit opening balance separate from their current valuation
- [x] Debts can retain an explicit opening balance separate from their current balance
- [x] Opening net worth is calculated as opening assets minus opening liabilities
- [x] Existing balances are excluded from income/expense activity and only subsequent transactions change operating cash flow
- [x] Savings goal allocations remain internal earmarks and do not change net worth
- [x] Starting-finance acceptance coverage added for pre-existing assets, liabilities, cash, and subsequent activity
- [ ] Live acceptance: enter a pre-existing household financial position and verify opening net worth
- [ ] Live acceptance: record first income/expense after setup and verify opening position plus activity
- [ ] Live acceptance: update debt and asset balances and verify current net worth propagation

## O. Starting Financial Position entry experience
- [x] Starting asset entry now supports explicit Cash and Bank Account categories alongside investments, property, vehicles, businesses, retirement, receivables, and other assets
- [x] Starting asset labels guide users to enter pre-existing accounts/assets rather than treating them as new income
- [x] Debt records support an explicit opening balance for pre-existing liabilities
- [x] Workbook validation accepts the structured starting-position categories and opening balances
- [x] Acceptance tests aligned with the structured Bank Account category
- [ ] Live acceptance: enter multiple pre-existing asset/account types and verify opening net worth
- [ ] Live acceptance: enter pre-existing debts and verify opening liabilities

## P. Account-linked transaction propagation
- [x] Income transactions support an optional financial account link
- [x] Expense transactions support an optional financial account link
- [x] Cash and bank account balances recalculate from opening balances plus linked activity
- [x] Legacy unassigned transactions remain supported without double-counting structured accounts
- [x] Income and expense entry screens expose cash/bank account selectors
- [x] Account-linked transaction propagation acceptance tests added
- [ ] Live acceptance: salary credited to a selected bank account updates that account balance
- [ ] Live acceptance: expense paid from a selected account updates only that account
- [ ] Live acceptance: account-linked activity propagates to dashboard and net worth

## Q. Debt payment accounting
- [x] Actual debt payments have a dedicated persisted event model
- [x] Debt payments link to a funding cash/bank account
- [x] Principal reduces the actual debt liability
- [x] Interest is recognized as an expense without reducing debt principal
- [x] Debt payment cash movement propagates to the selected account balance
- [x] Debt payoff simulator remains scenario-only and does not mutate actual debts
- [x] Workbook validation enforces debt payment amount = principal + interest
- [x] Net Worth and Advanced Analytics consume debt payment accounting
- [x] Debt payment acceptance tests added
- [ ] Live acceptance: record a real debt payment and verify account, debt, expense, and net worth changes together


## R. Savings goal account linkage
- [x] Savings goals support an optional real cash/bank account link
- [x] Savings goal funding-account selector added to the goal editor
- [x] Goal contributions remain internal earmarks rather than separate assets or expenses
- [x] Linked goal allocations reduce available cash only within the referenced account
- [x] Multiple goals linked to one account are aggregated and clamped to that account's balance
- [x] Goals linked across multiple accounts earmark each account independently
- [x] Savings goal allocations never inflate or reduce total assets or net worth
- [x] Workbook validation accepts linked savings goal account IDs
- [x] Acceptance tests cover single-account, multi-goal, multi-account, and post-transaction goal accounting

- [x] V1 validation run #373 passed TypeScript, acceptance tests, production build, production smoke, Docker build, and Docker smoke
- [x] Savings goal linkage and financial-model hardening deployed to Render and reached live (`dep-davf8gvdjqhc73ei9hjg`)
- [x] Legacy financial snapshot calls remain compatible with the pre-debt-payment opening-cash argument
- [x] Available cash excludes non-cash assets while total assets/net worth continue to include them
