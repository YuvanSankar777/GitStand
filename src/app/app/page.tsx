"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { parseGitLog } from "@/lib/parser";
import { detectBlockers } from "@/lib/blockers";
import { formatStandup } from "@/lib/formatters";
import { SAMPLE_GIT_LOG, SAMPLE_TICKETS } from "@/lib/sample";
import { FORMAT_LABELS, type Standup, type StandupFormat } from "@/lib/types";

type HistoryItem = { id: string; createdAt: string; format: string; standup: Standup };
type User = { id: string; email: string; name: string | null };

export default function AppPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);

  const [log, setLog] = useState("");
  const [tickets, setTickets] = useState("");
  const [showTickets, setShowTickets] = useState(false);
  const [standup, setStandup] = useState<Standup | null>(null);
  const [format, setFormat] = useState<StandupFormat>("bullets");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [usedMock, setUsedMock] = useState(false);
  const [copied, setCopied] = useState(false);
  const [history, setHistory] = useState<HistoryItem[]>([]);

  // GitHub auto-pull
  const [showGithub, setShowGithub] = useState(false);
  const [ghRepo, setGhRepo] = useState("");
  const [ghAuthor, setGhAuthor] = useState("");
  const [ghWindow, setGhWindow] = useState<"1" | "7" | "0">("7");
  const [ghLoading, setGhLoading] = useState(false);

  // Slack post
  const [slackState, setSlackState] = useState<"idle" | "posting" | "posted" | "error">("idle");
  const [slackMsg, setSlackMsg] = useState("");

  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => r.json())
      .then((d) => setUser(d.user))
      .catch(() => {});
    loadHistory();
  }, []);

  async function loadHistory() {
    try {
      const res = await fetch("/api/standups");
      if (!res.ok) return;
      const data = await res.json();
      setHistory(data.standups ?? []);
    } catch {}
  }

  const commits = useMemo(() => parseGitLog(log), [log]);
  const signals = useMemo(() => detectBlockers(commits), [commits]);
  const formatted = useMemo(
    () => (standup ? formatStandup(standup, format) : ""),
    [standup, format],
  );

  async function generate() {
    setError(null);
    setLoading(true);
    setCopied(false);
    try {
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ commits, tickets }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Generation failed");
      setStandup(data.standup as Standup);
      setUsedMock(Boolean(data.usedMock));
      await saveHistory(data.standup as Standup);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  async function saveHistory(s: Standup) {
    try {
      await fetch("/api/standups", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ standup: s, format, rawInput: log }),
      });
      loadHistory();
    } catch {}
  }

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/");
    router.refresh();
  }

  function updateItem(key: keyof Standup, idx: number, value: string) {
    if (!standup) return;
    const next = { ...standup, [key]: [...standup[key]] };
    next[key][idx] = value;
    setStandup(next);
  }
  function removeItem(key: keyof Standup, idx: number) {
    if (!standup) return;
    setStandup({ ...standup, [key]: standup[key].filter((_, i) => i !== idx) });
  }
  function addItem(key: keyof Standup) {
    if (!standup) return;
    setStandup({ ...standup, [key]: [...standup[key], ""] });
  }

  async function copy() {
    try {
      await navigator.clipboard.writeText(formatted);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {}
  }

  async function fetchGithub() {
    setError(null);
    setGhLoading(true);
    try {
      const since =
        ghWindow === "0"
          ? undefined
          : new Date(Date.now() - Number(ghWindow) * 86400000).toISOString();
      const res = await fetch("/api/github", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ repo: ghRepo, author: ghAuthor || undefined, since }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Fetch failed");
      if (!data.log) throw new Error("No commits found for that repo/author/window.");
      setLog(data.log);
      setStandup(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "GitHub fetch failed");
    } finally {
      setGhLoading(false);
    }
  }

  async function postSlack() {
    setSlackState("posting");
    setSlackMsg("");
    try {
      const res = await fetch("/api/slack", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: formatted }),
      });
      const data = await res.json();
      if (!res.ok) {
        setSlackState("error");
        setSlackMsg(data.detail || data.error || "Post failed");
        return;
      }
      setSlackState("posted");
      setTimeout(() => setSlackState("idle"), 2500);
    } catch {
      setSlackState("error");
      setSlackMsg("Network error");
    }
  }

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-[1400px] flex-col px-5 py-5">
      <TopBar email={user?.email} onLogout={logout} />

      <main className="mt-5 grid flex-1 grid-cols-1 gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)]">
        {/* LEFT: input */}
        <section className="flex flex-col gap-4 rounded-2xl border border-border bg-panel p-5">
          <div className="flex items-center justify-between">
            <h2 className="display text-sm text-foreground">1 · Your git activity</h2>
            <div className="flex gap-2">
              <button
                onClick={() => {
                  setLog(SAMPLE_GIT_LOG);
                  setTickets(SAMPLE_TICKETS);
                  setShowTickets(true);
                }}
                className="rounded-lg border border-border bg-panel-2 px-2.5 py-1 text-xs text-muted transition hover:text-foreground"
              >
                Load sample
              </button>
              {log && (
                <button
                  onClick={() => {
                    setLog("");
                    setTickets("");
                    setStandup(null);
                  }}
                  className="rounded-lg border border-border bg-panel-2 px-2.5 py-1 text-xs text-muted transition hover:text-foreground"
                >
                  Clear
                </button>
              )}
            </div>
          </div>

          <button
            onClick={() => setShowGithub((v) => !v)}
            className="flex w-fit items-center gap-1.5 text-xs font-semibold text-accent underline-offset-2 hover:underline"
          >
            {showGithub ? "− Hide GitHub pull" : "⤓ Pull commits from a GitHub repo"}
          </button>
          {showGithub && (
            <div className="flex flex-col gap-2 rounded-xl border border-border bg-panel-2 p-3">
              <input
                value={ghRepo}
                onChange={(e) => setGhRepo(e.target.value)}
                placeholder="owner/repo  ·  or  https://github.com/owner/repo"
                spellCheck={false}
                className="mono w-full rounded-lg border border-border bg-black/40 px-3 py-2 text-[13px] text-foreground placeholder:text-muted/60"
              />
              <div className="flex flex-wrap gap-2">
                <input
                  value={ghAuthor}
                  onChange={(e) => setGhAuthor(e.target.value)}
                  placeholder="author (optional)"
                  spellCheck={false}
                  className="mono min-w-0 flex-1 rounded-lg border border-border bg-black/40 px-3 py-2 text-[13px] text-foreground placeholder:text-muted/60"
                />
                <select
                  value={ghWindow}
                  onChange={(e) => setGhWindow(e.target.value as "1" | "7" | "0")}
                  className="rounded-lg border border-border bg-black/40 px-2 py-2 text-[13px] text-foreground"
                >
                  <option value="1">Last 24h</option>
                  <option value="7">Last 7 days</option>
                  <option value="0">Recent</option>
                </select>
                <button
                  onClick={fetchGithub}
                  disabled={ghLoading || !ghRepo.trim()}
                  className="flex items-center gap-1.5 rounded-lg bg-accent px-3 py-2 text-xs font-semibold text-black transition enabled:hover:brightness-110 disabled:opacity-40"
                >
                  {ghLoading ? <Spinner /> : "Fetch"}
                </button>
              </div>
            </div>
          )}

          <textarea
            value={log}
            onChange={(e) => setLog(e.target.value)}
            placeholder={"$ git log --oneline\n\nPaste your commits here…"}
            spellCheck={false}
            className="mono h-60 w-full resize-none rounded-xl border border-border bg-black/40 p-4 text-[13px] leading-relaxed text-foreground placeholder:text-muted/60"
          />

          <div className="flex items-center justify-between text-xs text-muted">
            <span>
              <span className="text-accent">{commits.length}</span> commit
              {commits.length === 1 ? "" : "s"} parsed
            </span>
            {signals.length > 0 && (
              <span className="rounded-full border border-warn/40 bg-warn/10 px-2 py-0.5 text-warn">
                {signals.length} blocker signal{signals.length === 1 ? "" : "s"} detected
              </span>
            )}
          </div>

          <button
            onClick={() => setShowTickets((v) => !v)}
            className="w-fit text-xs text-muted underline-offset-2 hover:underline"
          >
            {showTickets ? "− Hide tickets" : "+ Add closed tickets (optional)"}
          </button>
          {showTickets && (
            <textarea
              value={tickets}
              onChange={(e) => setTickets(e.target.value)}
              placeholder="AUTH-142 Implement refresh token rotation"
              spellCheck={false}
              className="mono h-20 w-full resize-none rounded-xl border border-border bg-black/40 p-3 text-[13px] text-foreground placeholder:text-muted/60"
            />
          )}

          <button
            onClick={generate}
            disabled={loading || commits.length === 0}
            className="display mt-1 flex items-center justify-center gap-2 rounded-xl bg-accent px-4 py-3 text-sm text-black transition enabled:hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {loading ? (
              <>
                <Spinner /> Generating…
              </>
            ) : (
              <>⚡ Generate standup</>
            )}
          </button>

          {history.length > 0 && (
            <div className="mt-2 border-t border-border pt-3">
              <p className="mb-2 text-xs font-medium text-muted">
                Your standups · <span className="text-accent">{history.length}</span> saved
              </p>
              <div className="flex flex-col gap-1.5">
                {history.slice(0, 5).map((h) => (
                  <button
                    key={h.id}
                    onClick={() => setStandup(h.standup)}
                    className="flex items-center justify-between rounded-lg border border-border bg-panel-2 px-3 py-1.5 text-left text-xs text-muted transition hover:text-foreground"
                  >
                    <span>{new Date(h.createdAt).toLocaleString()}</span>
                    <span className="text-accent">
                      {h.standup.yesterday.length}✓ · {h.standup.blockers.length}⚠
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </section>

        {/* RIGHT: output */}
        <section className="flex flex-col gap-4 rounded-2xl border border-border bg-panel p-5">
          {error && (
            <div className="rounded-xl border border-danger/40 bg-danger/10 p-3 text-sm text-danger">
              {error}
            </div>
          )}

          {!standup && !error && <EmptyState hasCommits={commits.length > 0} />}

          {standup && (
            <>
              <div className="flex items-center justify-between">
                <h2 className="display text-sm text-foreground">2 · Review &amp; ship</h2>
                {usedMock && (
                  <span className="rounded-full border border-border bg-panel-2 px-2 py-0.5 text-[10px] text-muted">
                    offline mock — add GROQ_API_KEY for live AI
                  </span>
                )}
              </div>

              <EditableSection
                title="Yesterday"
                accent="var(--accent)"
                items={standup.yesterday}
                onChange={(i, v) => updateItem("yesterday", i, v)}
                onRemove={(i) => removeItem("yesterday", i)}
                onAdd={() => addItem("yesterday")}
              />
              <EditableSection
                title="Today"
                accent="var(--accent-2)"
                items={standup.today}
                onChange={(i, v) => updateItem("today", i, v)}
                onRemove={(i) => removeItem("today", i)}
                onAdd={() => addItem("today")}
              />
              <EditableSection
                title="Blockers"
                accent="var(--warn)"
                highlight
                items={standup.blockers}
                onChange={(i, v) => updateItem("blockers", i, v)}
                onRemove={(i) => removeItem("blockers", i)}
                onAdd={() => addItem("blockers")}
              />

              {/* Formatted output */}
              <div className="mt-1 rounded-xl border border-border bg-black/40">
                <div className="flex items-center justify-between border-b border-border px-3 py-2">
                  <div className="flex flex-wrap gap-1">
                    {(Object.keys(FORMAT_LABELS) as StandupFormat[]).map((f) => (
                      <button
                        key={f}
                        onClick={() => setFormat(f)}
                        className={`rounded-md px-2.5 py-1 text-xs transition ${
                          format === f ? "bg-accent text-black" : "text-muted hover:text-foreground"
                        }`}
                      >
                        {FORMAT_LABELS[f]}
                      </button>
                    ))}
                  </div>
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={postSlack}
                      disabled={slackState === "posting"}
                      className="flex items-center gap-1 rounded-md border border-border bg-panel-2 px-2.5 py-1 text-xs text-foreground transition hover:brightness-125 disabled:opacity-50"
                    >
                      {slackState === "posting"
                        ? "Posting…"
                        : slackState === "posted"
                          ? "✓ Posted"
                          : "Post to Slack"}
                    </button>
                    <button
                      onClick={copy}
                      className="rounded-md border border-border bg-panel-2 px-2.5 py-1 text-xs text-foreground transition hover:brightness-125"
                    >
                      {copied ? "✓ Copied" : "Copy"}
                    </button>
                  </div>
                </div>
                {slackState === "error" && (
                  <p className="border-b border-border px-3 py-1.5 text-[11px] text-warn">{slackMsg}</p>
                )}
                <pre className="mono max-h-64 overflow-auto whitespace-pre-wrap p-4 text-[13px] leading-relaxed text-foreground">
                  {formatted}
                </pre>
              </div>
            </>
          )}
        </section>
      </main>
    </div>
  );
}

function TopBar({ email, onLogout }: { email?: string; onLogout: () => void }) {
  return (
    <header className="flex items-center justify-between rounded-2xl border border-border bg-panel px-5 py-3">
      <div className="flex items-center gap-3">
        <div className="slash flex h-9 w-11 items-center justify-center bg-accent text-sm font-bold text-black">
          GS
        </div>
        <div>
          <h1 className="display text-base leading-none text-foreground">GitStand</h1>
          <p className="text-[11px] text-muted">Ready to ship your standup.</p>
        </div>
      </div>
      <div className="flex items-center gap-3">
        {email && <span className="hidden text-xs text-muted sm:block">{email}</span>}
        <Link
          href="/app/settings"
          className="rounded-lg border border-border bg-panel-2 px-3 py-1.5 text-xs text-foreground transition hover:border-accent hover:text-accent"
        >
          Settings
        </Link>
        <button
          onClick={onLogout}
          className="rounded-lg border border-border bg-panel-2 px-3 py-1.5 text-xs text-foreground transition hover:border-accent hover:text-accent"
        >
          Log out
        </button>
      </div>
    </header>
  );
}

function EmptyState({ hasCommits }: { hasCommits: boolean }) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-3 py-16 text-center">
      <div className="text-4xl opacity-60">🏁</div>
      <p className="max-w-xs text-sm text-muted">
        {hasCommits
          ? 'Hit "Generate standup" to turn these commits into a review-ready update.'
          : "Paste a git log, pull from GitHub, or click Load sample — then generate."}
      </p>
    </div>
  );
}

function EditableSection({
  title,
  accent,
  items,
  highlight = false,
  onChange,
  onRemove,
  onAdd,
}: {
  title: string;
  accent: string;
  items: string[];
  highlight?: boolean;
  onChange: (i: number, v: string) => void;
  onRemove: (i: number) => void;
  onAdd: () => void;
}) {
  return (
    <div
      className="rounded-xl border p-3.5"
      style={{
        borderColor: highlight && items.length ? "var(--warn)" : "var(--border)",
        background: highlight && items.length ? "rgba(255,176,32,0.06)" : "var(--panel-2)",
      }}
    >
      <div className="mb-2 flex items-center gap-2">
        <span className="h-2 w-2 rounded-full" style={{ background: accent }} />
        <h3 className="display text-xs text-foreground">{title}</h3>
        {highlight && items.length > 0 && <span className="text-[10px] text-warn">auto-flagged</span>}
      </div>
      <div className="flex flex-col gap-1.5">
        {items.length === 0 && <p className="text-xs text-muted">— none —</p>}
        {items.map((item, i) => (
          <div key={i} className="group flex items-start gap-2">
            <span className="mt-2 select-none" style={{ color: accent }}>
              •
            </span>
            <AutoTextarea value={item} onChange={(v) => onChange(i, v)} />
            <button
              onClick={() => onRemove(i)}
              className="mt-1 select-none text-muted opacity-0 transition group-hover:opacity-100 hover:text-danger"
              aria-label="Remove"
            >
              ✕
            </button>
          </div>
        ))}
      </div>
      <button onClick={onAdd} className="mt-2 text-xs text-muted underline-offset-2 hover:underline">
        + add
      </button>
    </div>
  );
}

function AutoTextarea({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const ref = useRef<HTMLTextAreaElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${el.scrollHeight}px`;
  }, [value]);
  return (
    <textarea
      ref={ref}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      rows={1}
      className="flex-1 resize-none overflow-hidden rounded-md bg-transparent px-1 py-1 text-[13px] leading-snug text-foreground focus:bg-black/40"
    />
  );
}

function Spinner() {
  return (
    <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-black/40 border-t-black" />
  );
}
