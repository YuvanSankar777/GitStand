import Link from "next/link";
import { getCurrentUser } from "@/lib/auth";

export default async function Landing() {
  const user = await getCurrentUser();

  return (
    <div className="relative flex min-h-screen flex-col overflow-hidden">
      {/* nav */}
      <header className="z-10 mx-auto flex w-full max-w-6xl items-center justify-between px-6 py-5">
        <div className="flex items-center gap-3">
          <div className="slash flex h-9 w-11 items-center justify-center bg-accent text-sm font-bold text-black">
            GS
          </div>
          <span className="display text-lg tracking-wide">GitStand</span>
        </div>
        <nav className="flex items-center gap-2">
          {user ? (
            <Link
              href="/app"
              className="display rounded-lg bg-accent px-4 py-2 text-xs text-black transition hover:brightness-110"
            >
              Open app
            </Link>
          ) : (
            <>
              <Link
                href="/login"
                className="rounded-lg border border-border px-4 py-2 text-xs text-foreground transition hover:border-accent hover:text-accent"
              >
                Log in
              </Link>
              <Link
                href="/signup"
                className="display rounded-lg bg-accent px-4 py-2 text-xs text-black transition hover:brightness-110"
              >
                Get started
              </Link>
            </>
          )}
        </nav>
      </header>

      {/* hero */}
      <main className="z-10 mx-auto flex w-full max-w-6xl flex-1 flex-col justify-center px-6 py-12">
        <div className="max-w-3xl">
          <span className="inline-flex items-center gap-2 rounded-full border border-accent/40 bg-accent/10 px-3 py-1 text-xs font-semibold text-accent">
            READY TO SHIP · ASYNC STANDUPS
          </span>
          <h1 className="display mt-6 text-5xl leading-[0.95] text-foreground sm:text-7xl">
            Your commits,
            <br />
            written up as your
            <br />
            <span className="text-accent">standup.</span>
          </h1>
          <p className="mt-6 max-w-xl text-base text-muted sm:text-lg">
            GitStand reads your real git activity and writes your daily standup for you —
            in your team&apos;s format, with blockers auto-flagged. You just review and send.
          </p>

          <div className="mt-8 flex flex-wrap items-center gap-3">
            <Link
              href={user ? "/app" : "/signup"}
              className="display rounded-xl bg-accent px-6 py-3 text-sm text-black transition hover:brightness-110"
            >
              {user ? "Open the app →" : "Start free →"}
            </Link>
            <Link
              href={user ? "/app" : "/login"}
              className="rounded-xl border border-border px-6 py-3 text-sm text-foreground transition hover:border-accent hover:text-accent"
            >
              {user ? "Go to dashboard" : "I have an account"}
            </Link>
          </div>

          <p className="mt-6 text-sm italic text-muted">
            &ldquo;Geekbot asks you what you did. GitStand already knows.&rdquo;
          </p>
        </div>

        {/* feature strip */}
        <div className="mt-16 grid grid-cols-1 gap-4 sm:grid-cols-3">
          <Feature
            k="01"
            title="Activity-sourced"
            body="Generated from your commits, PRs and tickets — not from what you remember at 9am."
          />
          <Feature
            k="02"
            title="Blockers auto-flagged"
            body="WIP, reverts and stuck signals are surfaced automatically — the part humans skip."
          />
          <Feature
            k="03"
            title="One-click ship"
            body="Bullets, changelog or exec summary — copy it or post straight to Slack."
          />
        </div>
      </main>

      <footer className="z-10 mx-auto w-full max-w-6xl px-6 py-6 text-xs text-muted">
        GitStand — pull from GitHub, generate with AI, post to Slack.
      </footer>
    </div>
  );
}

function Feature({ k, title, body }: { k: string; title: string; body: string }) {
  return (
    <div className="rounded-2xl border border-border bg-panel/70 p-5 backdrop-blur">
      <div className="display text-2xl text-accent">{k}</div>
      <h3 className="display mt-2 text-sm text-foreground">{title}</h3>
      <p className="mt-2 text-sm text-muted">{body}</p>
    </div>
  );
}
