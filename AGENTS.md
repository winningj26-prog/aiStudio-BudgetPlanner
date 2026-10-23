# Base44 sandbox notes

## How the app runs here

- One Node process serves everything: `npm run dev` → `tsx server.ts`, an Express server that
  serves the API routes (`/api/*`, `/healthz`) and mounts the Vite React frontend in middleware
  mode on `http://0.0.0.0:3000` (see `docker-compose.base44.yml`, service `web`).
- The repo's own `Dockerfile` is **production only** (it bakes the source with `COPY . .` and
  runs `npm run build`), so it cannot reflect edits. Always run from the mounted source via
  `docker-compose.base44.yml`; `node_modules` lives in a named volume and is installed on
  container start from `package.json` (`npm install`, matching CI — there is no `package-lock.json`,
  only `bun.lock`).
- There is **no local database service**. Supabase (hosted) is the app's only database/auth
  backend. `supabase/migrations/*.sql` are applied to the hosted project, not locally; nothing to
  run in the sandbox.

## Environment variables (external service credentials)

Supabase credentials are owned by the user and are delivered by the platform to
`/run/base44/app.env`, wired as the last `env_file:` entry for the `web` service:

| Variable | Used by | Notes |
|---|---|---|
| `SUPABASE_URL` | `server.ts` (privileged REST/auth calls) | Supabase project URL |
| `SUPABASE_SECRET_KEY` | `server.ts` | Secret key; `SUPABASE_SERVICE_ROLE_KEY` is accepted as a legacy alternative |
| `VITE_SUPABASE_URL` | browser bundle (`src/services/supabaseClient.ts`) | read when the dev server starts — restart `web` after changing it |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | browser bundle | publishable/anon key |
| `GEMINI_API_KEY` | AI insights + category suggestions | optional: without it the server returns built-in fallback insights and keyword-based category matching |

Non-obvious behaviour:

- The app **boots and serves the sign-in screen without any Supabase value** (`createClient` falls
  back to an invalid host, so the client reports "not configured" in the console), but sign-in and
  every account/workbook API then fail. That is why no development placeholders are generated for
  the Supabase URLs — a bogus URL is worse than an absent one. Boot with
  `docker compose -f docker-compose.base44.yml up -d`, then add the real values as secrets.
- Billing (Monime `MONIME_*`) and Firebase identity bridge env vars are only needed when those
  integrations are actually exercised; their absence does not block the app.
- Local infra credentials are not used anywhere: there is no local DB/cache.

## Base44 sandbox overrides

- `vite.config.ts` adds `server.allowedHosts = ['.' + BASE44_SANDBOX_HOST_DOMAIN]` **only** when
  `BASE44_PREVIEW_MODE === '1'` and the domain variable is set, because the preview proxy sends
  `Host: 3000-<sandbox id>.$BASE44_SANDBOX_HOST_DOMAIN` and Vite 5 otherwise answers
  `403 Blocked request. This host is not allowed.` Without the flag (or the variable) no allowlist
  is configured and Vite's default behaviour is unchanged. The value is never hardcoded.
- `BASE44_PREVIEW_MODE`, `BASE44_PUBLIC_HOST_SUFFIX` and `BASE44_SANDBOX_HOST_DOMAIN` are passed
  into the `web` service from the platform environment.

## Product 2 is intentionally unavailable

`server.ts` returns `410 Product 2 is temporarily disabled.` for every `/product2*` request, so its
legacy source under `product2/` has no service in the sandbox compose file. Do not "fix" that route
without the product decision; its CI workflow (`.github/workflows/product2.yml`) is manual.

## Verifying a change

```sh
docker compose -f docker-compose.base44.yml up -d --build     # start (or restart after config edits)
docker compose -f docker-compose.base44.yml ps                # web must be "healthy"
docker compose -f docker-compose.base44.yml logs -f web       # dev server logs
docker compose -f docker-compose.base44.yml exec -T web npm run lint   # tsc --noEmit (type check)
docker compose -f docker-compose.base44.yml exec -T web npm test       # acceptance tests (test/acceptance.test.ts)
curl -s http://localhost:3000/healthz                          # API health probe
curl -s http://localhost:3000/ | grep vite                     # dev server serving live source
```

Frontend edits hot-reload; edits to `server.ts`, `vite.config.ts`, or the env vars need
`docker compose -f docker-compose.base44.yml restart web`. The compose healthcheck probes both
`/healthz` and `/` and prints which one failed.

## Auth-gated screens

Everything past the sign-in screen requires a real Supabase session. Anonymous browser checks can
only confirm the sign-in screen renders — verify signed-in views through the user's own preview
session instead of faking credentials.
