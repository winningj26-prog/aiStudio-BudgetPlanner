# Supabase account bridge

BudgetPlanner currently authenticates users with Firebase/Google. Supabase is the central account store for the future four-app toolkit.

## Flow

1. Firebase restores or creates the Google identity in the browser.
2. The browser requests a Firebase ID token.
3. The browser sends that token to `POST /api/toolkit/session`.
4. The server verifies the token with Firebase Admin.
5. The server upserts the user's profile in Supabase using `firebase_uid`.
6. The server reads the user's active subscription and plan entitlements.
7. The server returns the shared toolkit session to the browser.

The browser never receives `SUPABASE_SERVICE_ROLE_KEY` and does not write directly to the account tables.

## Server environment

Set these variables on Render (or the server runtime):

- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `FIREBASE_PROJECT_ID`
- `FIREBASE_CLIENT_EMAIL`
- `FIREBASE_PRIVATE_KEY`
- `GEMINI_API_KEY`

The Firebase private key is a server secret. Preserve its newline characters when configuring the Render secret.

## Current behavior

The account bridge is intentionally non-blocking for BudgetPlanner V1. If the Supabase/Firebase Admin bridge is not configured yet, the existing Firebase login and local budgeting workflow continue to work.

The default account plan is `free` when the user has no live subscription row.

## Database migration

Apply migrations in order:

- `0001_toolkit_account_foundation.sql`
- `0002_firebase_identity_link.sql`

Migration 0002 adds a unique `firebase_uid` because Firebase UIDs are opaque strings and are not guaranteed to be UUIDs.

## Security boundary

Frontend entitlement data is for UI behavior only. Future paid APIs must enforce entitlements server-side. Stripe subscription state will later become the authoritative billing input through webhooks.
