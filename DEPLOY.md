# Deploying GitStand to Vercel

Vercel's serverless filesystem is read-only, so SQLite can't be used in
production. GitStand deploys on **Postgres** (one-line Prisma change).

## 1. Create a Postgres database

**Option A — Vercel Postgres (recommended, least setup):**
Created during import (step 3). It auto-adds `DATABASE_URL` to the project.

**Option B — Neon (free):**
1. Sign up at https://neon.tech → create a project.
2. Copy the connection string (`postgresql://…?sslmode=require`).

## 2. Push the repo (already done)

The GitHub repo is https://github.com/YuvanSankar777/GitStand.

## 3. Import to Vercel

1. https://vercel.com → **Add New… → Project** → import the GitStand repo.
2. Framework preset: **Next.js** (auto-detected).
3. If using **Vercel Postgres**: open the **Storage** tab → **Create Database →
   Postgres** → connect it to the project (sets `DATABASE_URL` automatically).
   If using **Neon**: add `DATABASE_URL` manually in step 4.

## 4. Environment variables (Project → Settings → Environment Variables)

| Key | Value |
| --- | --- |
| `DATABASE_URL` | Postgres URL (auto-set by Vercel Postgres, or paste Neon's) |
| `AUTH_SECRET` | `openssl rand -hex 32` (or Node crypto) — a fresh 64-char secret |
| `GROQ_API_KEY` | your Groq key (`gsk_…`) |
| `GROQ_MODEL` | `llama-3.3-70b-versatile` |
| `SLACK_WEBHOOK_URL` | optional demo fallback channel |
| `GITHUB_TOKEN` | optional (private repos / higher rate limit) |

## 5. Deploy

Click **Deploy**. The `vercel-build` script runs
`prisma generate && prisma db push && next build`, which creates the tables on
first deploy. Done — you get a `https://<project>.vercel.app` URL.

## Troubleshooting

- **`DATABASE_URL` not found at build:** the Vercel Postgres integration may only
  expose `POSTGRES_PRISMA_URL`. Add a `DATABASE_URL` env var with the same value.
- **`db push` fails over a pooled connection:** set `DATABASE_URL` to the
  **non-pooling** URL (`…-pooler` removed, or the `_UNPOOLED` variant) — DDL needs a
  direct connection. Runtime queries are fine on either.
- **Redeploy after a schema change:** the `--accept-data-loss` flag lets
  `db push` apply changes non-interactively (fine here — no critical data).

## Running locally against the same Postgres

```bash
vercel env pull .env.local     # pulls DATABASE_URL etc. from the project
npx prisma db push             # sync schema
npm run dev
```
