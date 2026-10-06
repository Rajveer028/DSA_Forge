# Deploying DSA Forge to Vercel

The app stores everything in PostgreSQL. There is no local-file fallback any
more, so the same `DATABASE_URL` works for development and for the deployment —
point both at your Neon database and the only difference between them is the
machine running the code.

## What a deployment needs

| Variable | Value | Why |
|---|---|---|
| `DATABASE_URL` | `postgresql://…-pooler….neon.tech/neondb?sslmode=require` | The database. Use the **pooled** host (`-pooler`): a serverless deployment opens a connection per instance, and the pooler is what stops that exhausting the connection limit. |
| `SESSION_SECRET` | a long random string | Signs session cookies. **The app throws without it in production.** Generate one with `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`. Keep it stable — changing it signs everyone out. |
| `NEXT_PUBLIC_APP_URL` | `https://<your-app>.vercel.app` | Used in absolute links. |
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | `pk_…` | Clerk sign-in/sign-up. Without **both** Clerk keys the app falls back to its built-in email/password form, which also works. |
| `CLERK_SECRET_KEY` | `sk_…` | Server-side Clerk calls. Never expose this to the browser. |
| `ADMIN_EMAILS` | your email (optional) | Grants the platform ADMIN role on sign-up. |

Set them under **Settings → Environment Variables → Production**, then
**redeploy** — environment variables are read at build and boot, so an existing
deployment will not pick them up on its own.

## Preparing the database

Neon gives you an empty database. Create the schema and load the catalogue from
your own machine; nothing here runs on Vercel.

```powershell
# PowerShell — or just put DATABASE_URL in .env and omit this line
$env:DATABASE_URL="postgresql://…"

npm run db:deploy    # applies prisma/migrations
npm run db:seed      # 300 problems, companies, achievements — idempotent
```

`npm run db:seed` prints the host it is writing to, so you can see at a glance
whether you are pointed at the deployment or somewhere else.

## Checking it

`/api/health` answers without authentication and reports what the server can
actually see:

```json
{"status":"ok","checks":{
  "database":{"configured":true,"reachable":true,"kind":"remote"},
  "auth":{"configured":true,"sessionSecret":true}, ... }}
```

- `"kind":"file"` — `DATABASE_URL` never arrived; the app fell back to a stale default.
- `"reachable":false` — the URL is wrong, or the database is unreachable.
- `"sessionSecret":false` — `SESSION_SECRET` is unset, and sign-in will fail.

## Verifying a deployment

`npm run audit:routes -- --base https://<your-app>.vercel.app` walks every page
and API route as a signed-in user and reports the status of each. It is the
fastest way to tell a configuration problem from a code problem: a wall of 503s
means the database or session secret is wrong, while a single unexpected status
points at one route.

## Code execution on Vercel

Vercel cannot run gcc/javac, so the old local sandbox was refused in
production and Run/Submit returned **503 EXECUTION_UNAVAILABLE**.

That is no longer the default. A production deploy **without**
`EXECUTION_SERVICE_URL` now judges through the **Piston** compiler API
(`PISTON_URL`, default `https://emkc.org/api/v2/piston`). The public endpoint
requires a valid `PISTON_API_KEY`; alternatively use a self-hosted Piston
endpoint. Student code never runs inside the Next.js process.

Optional:

| Variable | Value |
|---|---|
| `PISTON_URL` | Self-hosted Piston base, e.g. `https://piston.yourdomain/api/v2/piston` |
| `PISTON_API_KEY` | Required by the public Piston endpoint; set a valid bearer token |
| `EXECUTION_DRIVER` | `piston` (explicit) · `remote` (Docker worker) · `none` (disable) |

To use the containerised worker in [`sandbox/`](sandbox/) instead:

| Variable | Value |
|---|---|
| `EXECUTION_DRIVER` | `remote` |
| `EXECUTION_SERVICE_URL` | `https://<your-sandbox-host>` |
| `EXECUTION_SERVICE_TOKEN` | the shared secret you configure on the worker |

**AI features** stay off unless `AI_API_KEY` is set; the built-in adaptive engine
covers recommendations and learning paths without it.

---

## Troubleshooting

| Symptom | Cause |
|---|---|
| "The server cannot reach its database" | `DATABASE_URL` is unset or wrong. Check `/api/health`. |
| "The server is missing SESSION_SECRET" | Set it in Vercel and redeploy. |
| Sign-in works, then every page bounces to sign-in | `SESSION_SECRET` changed between deployments, invalidating existing cookies. Set a fixed value. |
| `relation "user_accounts" does not exist` | `npm run db:deploy` was never run against this database. |
| The site loads but has no problems | `npm run db:seed` was not run against this database. |
| `too many connections` | You are using the direct Neon host. Switch to the `-pooler` one. |

---

## Appendix: the move from SQLite

This project stored its data in a local SQLite file until it needed to be
deployed. All 4,822 rows were copied to PostgreSQL by a one-off script that
read through a second generated Prisma client, so SQLite's integer booleans and
text JSON were decoded and re-encoded rather than copied as raw bytes, and every
row kept its id — which is what kept the foreign keys valid without remapping.

The script and its companion schema were deleted afterwards. They depended on a
generated client that is not in version control, so their presence broke
`next build` on any machine that had not generated it first. Recover them from
git history if the migration ever needs auditing or repeating:

```bash
git show d19b836:prisma/migrate-to-postgres.ts
git show d19b836:prisma/schema.sqlite.prisma
```
