# BudgetPlanner V1 Checklist

Updated after each completed implementation/verification task.

## A. Core V1 / stability
- [x] Authentication/session persistence
- [x] Account-scoped local storage
- [x] Workbook repository abstraction
- [x] Cloud persistence foundation
- [x] Cloud endpoint authorization/data-path review
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
- [ ] Free/Plus/Pro acceptance testing

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
- [ ] Billing edge-case/error pass
- [x] Monime integration explicitly deferred

## G. Production security
- [x] Protected tables use RLS
- [x] Browser uses Supabase publishable key
- [x] Server-only privileged Supabase access
- [x] Platform secrets kept out of browser responses
- [x] Supabase Security Advisor reviewed (2026-10-01)
- [ ] Enable leaked-password protection if available on current Supabase plan
- [ ] Final admin authorization/audit review
- [ ] Rotate/remove temporary test credentials
- [ ] Production auth/email security review

## H. Acceptance coverage
- [x] Storage namespacing tests
- [x] Legacy storage migration tests
- [x] Local workbook repository round-trip test
- [x] Free/Plus/Pro entitlement helper tests
- [x] Mobile Money state transition test
- [x] Decimal billing acceptance tests
- [x] Cloud save/load acceptance test
- [x] AI Insights acceptance test
- [x] Advanced Analytics acceptance test
- [x] Google Sheets create/read/write acceptance test
- [ ] Admin/non-admin acceptance test
- [ ] Admin account edit/suspend/delete live acceptance test
- [ ] Auth/session acceptance test
- [ ] Full production smoke/acceptance pass

- [x] V1 validation TypeScript blocker fixed (duplicate auth import)
- [x] V1 validation pipeline passed (#200)
- [x] AI production hardening merged to main
- [x] AI production hardening deployed and verified live

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
