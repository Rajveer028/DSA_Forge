# Deploying DSA Forge to Vercel

Local development needs no configuration: storage is a SQLite file and a
development session secret is derived automatically. A deployment needs neither
of those things to be true, and that is the whole of this document.

## Why the local defaults cannot be deployed

`DATABASE_URL` defaults to `file:./prisma/dsaforge.db` — a file on the machine
running the app. On Vercel the filesystem is **read-only apart from `/tmp`**, and
every request may be served by a fresh instance, so a file database can neither
be written nor persist. Every query fails, and the sign-in form reports that it
cannot reach its database.

The fix is a networked database. The app already talks to SQLite through the
libsql driver, so [Turso](https://turso.tech) needs no schema change: the same
migrations and the same seed apply unchanged.

---

## 1. Create the database

Install the Turso CLI and sign in ([docs](https://docs.turso.tech/cli)):

```bash
curl -sSfL https://get.tur.so/install.sh | bash   # macOS / Linux / WSL
turso auth signup
```

Create the database and read its credentials:

```bash
turso db create dsaforge
turso db show dsaforge --url          # -> libsql://dsaforge-<org>.turso.io
turso db tokens create dsaforge       # -> the auth token
```

## 2. Create the schema and seed it

Run both from your own machine, pointed at the new database. Nothing here runs
on Vercel — the deployment only ever reads and writes an already-prepared
database.

```bash
# PowerShell
$env:DATABASE_URL="libsql://dsaforge-<org>.turso.io"
$env:DATABASE_AUTH_TOKEN="<token>"
npm run db:deploy:remote
npm run db:seed
```

```bash
# bash / zsh
export DATABASE_URL="libsql://dsaforge-<org>.turso.io"
export DATABASE_AUTH_TOKEN="<token>"
npm run db:deploy:remote
npm run db:seed
```

`db:deploy:remote` applies every migration in `prisma/migrations` over the
libsql client and records them in `_prisma_migrations`, exactly as Prisma would.
It exists because `prisma.config.ts` has nowhere to put an auth token, so
`prisma migrate deploy` cannot authenticate against Turso. It is safe to re-run:
migrations already applied are skipped.

`db:seed` loads the 300-problem catalogue, companies and achievements. It is
idempotent.

Do not commit these values. Your local `.env` should keep pointing at the file
database so development stays offline.

## 3. Configure Vercel

Project → **Settings → Environment Variables**, for **Production** (and Preview
if you use it):

| Variable | Value | Why |
|---|---|---|
| `DATABASE_URL` | `libsql://dsaforge-<org>.turso.io` | The database. Without it the app falls back to a file and refuses to start. |
| `DATABASE_AUTH_TOKEN` | the token from step 1 | Turso rejects unauthenticated connections. |
| `SESSION_SECRET` | a long random string | Signs session cookies. **The app throws without it in production** — generate one with `openssl rand -hex 32` or `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`. |
| `NEXT_PUBLIC_APP_URL` | `https://<your-app>.vercel.app` | Used in absolute links. |
| `ADMIN_EMAILS` | your email (optional) | Grants the platform ADMIN role on sign-up. |

Redeploy after saving — environment variables are read at build and boot, so an
existing deployment will not pick them up on its own.

## 4. Check it

Visit `/api/health`. It answers without authentication and reports what the
server can actually see:

```json
{"status":"ok","checks":{
  "database":{"configured":true,"reachable":true},
  "auth":{"configured":true}, ... }}
```

`"reachable": false` means the URL or token is wrong. Then sign up on the
deployed site — the first account works immediately, since seeding already
created the catalogue it lands on.

---

## What still will not work, and why

**Run and Submit.** Code execution compiles and runs real programs, which needs
gcc, javac and python plus a sandbox — none of which exist on Vercel, and the
local driver refuses to start in production on purpose (it is not a security
boundary). Everything else works: sign-up, sign-in, browsing all 300 problems,
revealing solutions, and the university portal including test codes.

To enable execution, deploy the containerised worker in [`sandbox/`](sandbox/)
to a host that runs Docker — Railway, Fly.io, Render or any VPS — and set:

| Variable | Value |
|---|---|
| `EXECUTION_DRIVER` | `remote` |
| `EXECUTION_SERVICE_URL` | `https://<your-sandbox-host>` |
| `EXECUTION_SERVICE_TOKEN` | the shared secret you configure on the worker |

See [`sandbox/README.md`](sandbox/README.md) for the worker itself.

**AI features** stay off unless `AI_API_KEY` is set; the built-in adaptive engine
covers recommendations and learning paths without it.

---

## Troubleshooting

| Symptom | Cause |
|---|---|
| "The server cannot reach its database" | `DATABASE_URL` is unset (so it fell back to a file) or wrong. Check `/api/health`. |
| "The server was refused by its database" | `DATABASE_AUTH_TOKEN` is missing, wrong, or was revoked. Re-issue with `turso db tokens create dsaforge`. |
| "The server is missing SESSION_SECRET" | Set it in Vercel and redeploy. |
| Sign-in works, then every page bounces to sign-in | `SESSION_SECRET` changed between deployments, invalidating existing cookies. Set a fixed value. |
| "no such table: user_accounts" | Step 2 was skipped — run `npm run db:deploy:remote`. |
| The site loads but has no problems | `npm run db:seed` was not run against the remote database. |
