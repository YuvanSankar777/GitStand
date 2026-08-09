"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

type Settings = {
  role: string;
  personalConfigured: boolean;
  company: { name: string; domain: string; configured: boolean } | null;
  resolved: "personal" | "company" | "env" | "none";
};

const RESOLVED_LABEL: Record<Settings["resolved"], string> = {
  personal: "your personal channel",
  company: "your company's shared channel",
  env: "the demo fallback channel",
  none: "nowhere yet — no channel set",
};

export default function SettingsPage() {
  const [settings, setSettings] = useState<Settings | null>(null);
  const [personal, setPersonal] = useState("");
  const [companyURL, setCompanyURL] = useState("");
  const [msg, setMsg] = useState<{ scope: string; text: string; ok: boolean } | null>(null);

  async function load() {
    const res = await fetch("/api/settings");
    if (res.ok) setSettings(await res.json());
  }
  useEffect(() => {
    load();
  }, []);

  async function save(scope: "personal" | "company", webhookURL: string) {
    setMsg(null);
    const res = await fetch("/api/settings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ scope, webhookURL }),
    });
    const data = await res.json();
    if (!res.ok) {
      setMsg({ scope, text: data.error || "Save failed", ok: false });
      return;
    }
    setMsg({ scope, text: "Saved.", ok: true });
    if (scope === "personal") setPersonal("");
    else setCompanyURL("");
    load();
  }

  const isAdmin = settings?.role === "admin";

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-2xl flex-col px-5 py-8">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="display text-2xl text-foreground">Settings</h1>
          <p className="text-sm text-muted">Choose where your standups get posted.</p>
        </div>
        <Link
          href="/app"
          className="rounded-lg border border-border px-3 py-1.5 text-xs text-foreground transition hover:border-accent hover:text-accent"
        >
          ← Back
        </Link>
      </div>

      {settings && (
        <div className="mb-6 rounded-xl border border-accent/40 bg-accent/10 px-4 py-3 text-sm">
          <span className="text-muted">Your standups currently post to </span>
          <span className="font-semibold text-accent">{RESOLVED_LABEL[settings.resolved]}</span>
          <span className="text-muted">.</span>
        </div>
      )}

      {/* Company channel */}
      <section className="mb-5 rounded-2xl border border-border bg-panel p-5">
        <div className="mb-1 flex items-center gap-2">
          <h2 className="display text-sm text-foreground">Company channel</h2>
          <span className="rounded-full border border-border bg-panel-2 px-2 py-0.5 text-[10px] text-muted">
            {settings?.role === "admin" ? "admin" : "member"}
          </span>
        </div>
        {settings?.company ? (
          <>
            <p className="text-xs text-muted">
              Team <span className="text-foreground">{settings.company.name}</span> ({settings.company.domain}) —
              shared by everyone with an @{settings.company.domain} email.{" "}
              {settings.company.configured ? (
                <span className="text-accent-2">Channel is set.</span>
              ) : (
                <span className="text-warn">No channel set yet.</span>
              )}
            </p>
            {isAdmin ? (
              <div className="mt-3 flex flex-col gap-2">
                <input
                  value={companyURL}
                  onChange={(e) => setCompanyURL(e.target.value)}
                  placeholder="https://hooks.slack.com/services/…  (your team's channel)"
                  spellCheck={false}
                  className="mono w-full rounded-lg border border-border bg-black/40 px-3 py-2 text-[13px] text-foreground placeholder:text-muted/60"
                />
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => save("company", companyURL)}
                    className="display rounded-lg bg-accent px-4 py-2 text-xs text-black transition hover:brightness-110"
                  >
                    Save team channel
                  </button>
                  {settings.company.configured && (
                    <button
                      onClick={() => save("company", "")}
                      className="rounded-lg border border-border px-3 py-2 text-xs text-muted transition hover:text-danger"
                    >
                      Clear
                    </button>
                  )}
                  {msg?.scope === "company" && (
                    <span className={`text-xs ${msg.ok ? "text-accent-2" : "text-danger"}`}>{msg.text}</span>
                  )}
                </div>
              </div>
            ) : (
              <p className="mt-3 text-xs text-muted">
                Only your company admin can change the team channel.
              </p>
            )}
          </>
        ) : (
          <p className="text-xs text-muted">You aren&apos;t part of a company.</p>
        )}
      </section>

      {/* Personal override */}
      <section className="rounded-2xl border border-border bg-panel p-5">
        <h2 className="display text-sm text-foreground">Personal channel (override)</h2>
        <p className="text-xs text-muted">
          Post to your own channel instead of the team&apos;s. Takes precedence over the company channel.{" "}
          {settings?.personalConfigured ? (
            <span className="text-accent-2">Set.</span>
          ) : (
            <span>Not set.</span>
          )}
        </p>
        <div className="mt-3 flex flex-col gap-2">
          <input
            value={personal}
            onChange={(e) => setPersonal(e.target.value)}
            placeholder="https://hooks.slack.com/services/…  (your channel)"
            spellCheck={false}
            className="mono w-full rounded-lg border border-border bg-black/40 px-3 py-2 text-[13px] text-foreground placeholder:text-muted/60"
          />
          <div className="flex items-center gap-2">
            <button
              onClick={() => save("personal", personal)}
              className="display rounded-lg bg-accent px-4 py-2 text-xs text-black transition hover:brightness-110"
            >
              Save personal channel
            </button>
            {settings?.personalConfigured && (
              <button
                onClick={() => save("personal", "")}
                className="rounded-lg border border-border px-3 py-2 text-xs text-muted transition hover:text-danger"
              >
                Clear
              </button>
            )}
            {msg?.scope === "personal" && (
              <span className={`text-xs ${msg.ok ? "text-accent-2" : "text-danger"}`}>{msg.text}</span>
            )}
          </div>
        </div>
        <p className="mt-4 text-[11px] text-muted">
          Create a webhook at api.slack.com/messaging/webhooks — it&apos;s bound to one channel, so whichever
          you paste is exactly where your standup lands.
        </p>
      </section>
    </div>
  );
}
