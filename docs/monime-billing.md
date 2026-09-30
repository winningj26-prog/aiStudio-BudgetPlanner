# Monime billing foundation

BudgetPlanner uses Monime instead of Stripe for toolkit payments.

## Current flow

1. Firebase authenticates the user.
2. The server resolves the user's toolkit profile.
3. The user requests a Plus or Pro checkout.
4. The server creates a Monime hosted Checkout Session.
5. The session carries the toolkit profile and plan in metadata/reference.
6. The browser is redirected to Monime.
7. Monime sends `checkout_session.completed` to `/api/billing/webhook`.
8. The server verifies the webhook signature, records the event idempotently, and activates the paid plan for a 30-day billing period.

Monime documents Checkout Sessions as hosted payment flows and recommends webhooks for authoritative payment lifecycle updates. Checkout creation requires a Monime Space ID, access token, and idempotency key. See the Monime Checkout Session and webhook documentation.

## Environment

Server-only:

- `MONIME_ACCESS_TOKEN`
- `MONIME_SPACE_ID`
- `MONIME_WEBHOOK_SECRET`
- `MONIME_API_VERSION` (defaults to `caph.2025-08-23`)
- `MONIME_CURRENCY` (defaults to `SLE`)
- `MONIME_PLUS_AMOUNT`
- `MONIME_PRO_AMOUNT`
- `APP_BASE_URL`

Amounts are in Monime's smallest supported currency unit.

## Recurring billing boundary

The current Monime API documentation available to this project exposes Checkout Sessions and checkout lifecycle webhooks, but the documented API index does not expose a subscription resource. This implementation therefore does not invent automatic recurring billing. Each completed checkout grants one configured 30-day billing period. Automatic renewal should be added after Monime confirms the appropriate recurring-payment API/flow for this account.

## Webhook security

Monime supports HMAC-SHA256 webhook verification. The implementation keeps the raw request body and compares the supplied signature using a timing-safe comparison. The receiver accepts common raw HMAC forms (`sha256=...`, `v1=...`, or plain hex) through `MONIME_WEBHOOK_SIGNATURE_HEADER`, which defaults to `monime-signature`.

Before Live mode, send a Monime test webhook and confirm the configured header and signature format against the provider's actual delivery.

Never put Monime credentials in browser code or Git.
