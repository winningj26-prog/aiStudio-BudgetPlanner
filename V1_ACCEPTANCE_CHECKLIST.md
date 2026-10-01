# BudgetPlanner V1 Acceptance Checklist

Baseline: `main` restored to `37dcc3d684741c02f60064fb35e6c8ac0e4509a9`.
Acceptance work is tracked on `v1-acceptance-next` until explicitly promoted to `main`.

## A. Core V1 / stability
- [x] Authentication/session persistence
- [x] Account-scoped local storage
- [x] Workbook repository abstraction
- [x] Cloud persistence foundation
- [x] Render deployment
- [x] Google Sheets foundation
- [x] Gemini integration foundation
- [x] Authentication input validation coverage
- [ ] Final edge-case/error handling pass
- [ ] Final production acceptance testing

## B. Free / Plus / Pro entitlements
- [ ] Activate Free / Plus / Pro subscription flow
- [ ] Free-plan limits enforced
- [ ] Plus-plan limits/features enforced
- [ ] Pro-plan limits/features enforced
- [ ] Subscription state persists across sessions
- [ ] Upgrade/downgrade handling
- [ ] Expired/cancelled subscription handling
- [ ] UI reflects current plan and features

## C. Authentication & onboarding
- [x] Email + password UI
- [x] Google sign-in UI
- [x] Password reset UI
- [x] Session persistence
- [x] Authentication input validation
- [x] Subscription selection during onboarding
- [ ] Production signup/sign-in acceptance
- [ ] New-user onboarding acceptance
- [ ] Returning-user onboarding bypass acceptance
- [ ] Incomplete onboarding handling

## D. Payments
- [x] Mobile Money integration foundation
- [x] Payment instructions
- [x] Payment submission validation
- [x] Pending-payment state
- [x] Duplicate-payment protection
- [ ] Payment verification/admin acceptance
- [ ] Subscription activation after verified payment
- [ ] Invalid payment end-to-end acceptance
- [ ] Live Mobile Money credential testing
- [ ] Production payment acceptance

## E. Cloud/data
- [x] Account-scoped workbook storage foundation
- [x] Cloud repository foundation
- [x] Offline/local fallback foundation
- [x] Malformed-data recovery coverage
- [ ] Cloud save/load acceptance
- [ ] Cross-account isolation acceptance against production
- [ ] Save/load error-state acceptance
- [ ] Production DB acceptance

## F. Google Sheets
- [x] Foundation
- [x] Spreadsheet parsing/data validation coverage
- [ ] Google auth acceptance
- [ ] Spreadsheet connection
- [ ] Import/sync
- [ ] Invalid spreadsheet end-to-end acceptance
- [ ] Permission-denied end-to-end acceptance
- [ ] Production Google smoke test

## G. Gemini / AI
- [x] Foundation
- [x] Entitlement restriction foundation
- [ ] AI request acceptance
- [ ] Missing/invalid API-key handling
- [ ] Rate-limit handling
- [ ] AI UI error handling
- [ ] Production Gemini smoke test

## H. Production acceptance
- [x] Render `/healthz` reports OK
- [ ] Production signup
- [ ] Login/logout
- [ ] Onboarding
- [ ] Free plan
- [ ] Plus/Pro pending-payment flow
- [ ] Cloud persistence
- [ ] Google Sheets
- [ ] Gemini
- [ ] Error handling
- [ ] Responsive/mobile smoke
- [ ] Final end-to-end acceptance
- [ ] V1 ACCEPTANCE PASSED

## Completed acceptance tasks on this branch
- [x] Centralized authentication input validation
- [x] LoginView wired to normalized email and password validation
- [x] Acceptance tests added for authentication validation
