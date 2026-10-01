# BudgetPlanner V1 Acceptance Checklist

Updated after each completed acceptance task.

## A. Core V1 / stability
- [x] Authentication/session persistence
- [x] Account-scoped local storage
- [x] Workbook repository abstraction
- [x] Cloud persistence foundation
- [x] Render deployment
- [x] Google Sheets foundation
- [x] Gemini integration foundation
- [x] Acceptance-test CI workflow
- [x] CI runs typecheck, acceptance tests, and production build
- [x] Local-storage, workbook, entitlement, payment-shape, and Google Sheets parser acceptance coverage
- [x] Onboarding input validation coverage
- [x] Authentication input validation coverage
- [x] Authentication UI wired to centralized validation helpers
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
- [ ] Email + password sign-up
- [ ] Email + password sign-in
- [ ] Google sign-in
- [ ] Password reset
- [ ] Session persistence
- [ ] New-user onboarding
- [ ] Returning-user onboarding bypass
- [x] Subscription selection is present during onboarding
- [x] Invalid/blank onboarding input is rejected
- [ ] Incomplete onboarding handling

## D. Payments
- [x] Mobile Money integration foundation
- [x] Payment instructions
- [x] Payment submission validation
- [x] Pending-payment state
- [x] Verified payment approval completes paid onboarding flow
- [x] Duplicate-payment protection
- [ ] Payment verification/admin flow acceptance
- [ ] Subscription activation after verified payment
- [ ] Invalid payment end-to-end acceptance
- [ ] Live Mobile Money credential testing
- [ ] Production payment acceptance test

## E. Cloud / data
- [x] Account-scoped workbook storage foundation
- [x] Cloud repository foundation
- [ ] Cloud save/load acceptance
- [ ] Cross-account isolation acceptance against production backend
- [x] Offline/local fallback foundations
- [x] Malformed-data recovery coverage
- [ ] Production DB acceptance

## F. Google Sheets
- [x] Foundation
- [ ] Google auth acceptance
- [ ] Spreadsheet connection
- [ ] Import/sync
- [x] Invalid spreadsheet/data parser coverage
- [ ] Permission-denied end-to-end acceptance
- [ ] Production Google smoke test

## G. Gemini / AI
- [x] Foundation
- [ ] AI request acceptance
- [ ] Missing/invalid API key acceptance
- [ ] Rate-limit handling
- [ ] AI UI error handling
- [x] Entitlement restrictions
- [x] AI requests require authenticated session
- [ ] Production Gemini smoke test

## H. Production acceptance
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
