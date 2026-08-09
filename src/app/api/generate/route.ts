import { NextResponse } from "next/server";
import type { Commit, Standup } from "@/lib/types";
import { detectBlockers } from "@/lib/blockers";

export const runtime = "nodejs";

// Groq is OpenAI-compatible. Key from console.groq.com starts with "gsk_".
const GROQ_URL = "https://api.groq.com/openai/v1/chat/completions";
const MODEL = process.env.GROQ_MODEL || "llama-3.3-70b-versatile";
const API_KEY = process.env.GROQ_API_KEY || process.env.XAI_API_KEY;

const SYSTEM_PROMPT = `You are a standup assistant. Given a developer's git commits (and optional
ticket titles) from the last working day, produce a daily standup.

Return ONLY valid JSON:
{
  "yesterday": ["human-readable accomplishment", ...],
  "today":     ["likely next task inferred from WIP/TODO commits", ...],
  "blockers":  ["anything implying the dev is stuck", ...]
}

Rules:
- Translate technical commit messages into outcomes a manager understands.
- Group related commits into one bullet.
- Treat commits containing WIP, revert, "fix broken", "still failing",
  TODO, or repeated fixes to the same file as potential blockers.
- Be concise. No fluff. Each bullet is a short phrase, not a sentence with a period.`;

function buildUserPrompt(commits: Commit[], tickets: string): string {
  const commitLines = commits
    .map((c) => `${c.hash} ${c.message}${c.files.length ? ` [files: ${c.files.join(", ")}]` : ""}`)
    .join("\n");
  return `COMMITS:\n${commitLines || "(none)"}\n\nTICKETS (optional):\n${tickets.trim() || "(none)"}`;
}

const STUCK = /\b(wip|revert|fix broken|still failing|still broken|todo|fixme|stuck|blocked|debugging|not working)\b/i;

/** Deterministic fallback so the full flow works with no API key (demo safety). */
function mockStandup(commits: Commit[]): Standup {
  const clean = (m: string) => m.replace(/^\w+(\([^)]*\))?:\s*/, "").trim();
  const done = commits
    .filter((c) => c.message && !STUCK.test(c.message))
    .slice(0, 6)
    .map((c) => clean(c.message));
  const today = commits
    .filter((c) => /\b(wip|todo)\b/i.test(c.message))
    .map((c) => clean(c.message).replace(/^(wip|todo)[:\s]*/i, "").trim())
    .slice(0, 3);
  return {
    yesterday: done.length ? done : ["Reviewed and committed work"],
    today: today.length ? today : ["Continue in-progress work"],
    blockers: [],
  };
}

function mergeBlockers(standup: Standup, commits: Commit[]): Standup {
  const detected = detectBlockers(commits).map((s) =>
    s.keyword === "repeated file"
      ? s.message
      : `${s.message} (looks like a ${s.keyword} — possible blocker)`,
  );
  const seen = new Set(standup.blockers.map((b) => b.toLowerCase()));
  const extra = detected.filter((d) => {
    const key = d.toLowerCase();
    for (const b of seen) if (b.includes(key.slice(0, 20))) return false;
    return true;
  });
  return { ...standup, blockers: [...standup.blockers, ...extra] };
}

async function callLLM(commits: Commit[], tickets: string): Promise<Standup> {
  const key = API_KEY;
  if (!key) return mockStandup(commits);

  const res = await fetch(GROQ_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
    body: JSON.stringify({
      model: MODEL,
      temperature: 0.3,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: buildUserPrompt(commits, tickets) },
      ],
    }),
  });

  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    throw new Error(`Groq ${res.status}: ${detail.slice(0, 300)}`);
  }

  const data = await res.json();
  const content = data?.choices?.[0]?.message?.content ?? "{}";
  const parsed = JSON.parse(content);
  return {
    yesterday: Array.isArray(parsed.yesterday) ? parsed.yesterday.map(String) : [],
    today: Array.isArray(parsed.today) ? parsed.today.map(String) : [],
    blockers: Array.isArray(parsed.blockers) ? parsed.blockers.map(String) : [],
  };
}

export async function POST(req: Request) {
  try {
    const { commits, tickets } = (await req.json()) as { commits: Commit[]; tickets?: string };
    if (!Array.isArray(commits) || commits.length === 0) {
      return NextResponse.json({ error: "No commits provided." }, { status: 400 });
    }
    const standup = await callLLM(commits, tickets ?? "");
    const merged = mergeBlockers(standup, commits);
    const usedMock = !API_KEY;
    return NextResponse.json({ standup: merged, usedMock });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
