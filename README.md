# GitStand — your commits, written up as your standup

You already did the work. GitStand reads your git activity and writes your daily
standup for you — in your team's format, with blockers auto-flagged. You just
review and send.

> Geekbot asks you what you did. GitStand already knows.

## What it does

1. **Paste your `git log`** (`--oneline` or default format both work).
2. **Generate** — an LLM turns technical commits into human-readable
   accomplishments, structured into **Yesterday / Today / Blockers**.
3. **Blockers auto-flagged** — commits with `WIP`, `revert`, `fix broken`,
   `still failing`, `TODO`, or repeated file churn are surfaced automatically.
4. **Review & edit** the draft inline.
5. **Pick a format** — Bullets / Changelog / Exec summary — and **copy** to Slack.
6. **History** of past standups is saved locally.

## Run it

```bash
npm install
npm run dev
```

Open http://localhost:3000 and click **Load sample** to try the full flow.

## Wire up live AI (Groq)

The app runs without a key using a deterministic offline generator (so the demo
never breaks). For live AI, add your Groq key to `.env.local`:

```bash
GROQ_API_KEY=gsk_...              # from https://console.groq.com
GROQ_MODEL=llama-3.3-70b-versatile  # optional
```

Restart `npm run dev`. The "offline mock" badge disappears when a key is present.

## Deploy (Vercel)

```bash
npx vercel        # then add GROQ_API_KEY in the Vercel project env vars
```

## Architecture

- **Frontend:** Next.js (App Router) + TypeScript + Tailwind v4. Single page:
  input left, generated preview right — `src/app/page.tsx`.
- **Parser:** `src/lib/parser.ts` — splits pasted `git log` into
  `{hash, message, timestamp, files}`, handling oneline / default / graph / stat.
- **Blocker detection:** `src/lib/blockers.ts` — keyword + repeated-file
  heuristics, merged into the LLM output deterministically.
- **LLM route:** `src/app/api/generate/route.ts` — calls Groq (OpenAI-compatible)
  with structured JSON output; falls back to a local mock when no key is set.
- **Formatters:** `src/lib/formatters.ts` — pure functions rendering the same
  JSON into Bullets / Changelog / Exec summary.
