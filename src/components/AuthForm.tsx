"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function AuthForm({ mode }: { mode: "login" | "signup" }) {
  const router = useRouter();
  const isSignup = mode === "signup";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await fetch(`/api/auth/${mode}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password, name: name || undefined }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Something went wrong");
      const next = new URLSearchParams(window.location.search).get("next");
      router.push(next && next.startsWith("/") ? next : "/app");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center px-6 py-10">
      <div className="w-full max-w-sm">
        <Link href="/" className="mb-8 flex items-center gap-3">
          <div className="slash flex h-9 w-11 items-center justify-center bg-accent text-sm font-bold text-black">
            GS
          </div>
          <span className="display text-lg tracking-wide">GitStand</span>
        </Link>

        <h1 className="display text-3xl text-foreground">
          {isSignup ? "Create account" : "Welcome back"}
        </h1>
        <p className="mt-2 text-sm text-muted">
          {isSignup
            ? "Start turning your commits into standups."
            : "Log in to your GitStand dashboard."}
        </p>

        <form onSubmit={submit} className="mt-7 flex flex-col gap-3">
          {isSignup && (
            <Field
              label="Name (optional)"
              type="text"
              value={name}
              onChange={setName}
              placeholder="Ada Lovelace"
              autoComplete="name"
            />
          )}
          <Field
            label="Email"
            type="email"
            value={email}
            onChange={setEmail}
            placeholder="you@company.com"
            autoComplete="email"
            required
          />
          <Field
            label="Password"
            type="password"
            value={password}
            onChange={setPassword}
            placeholder={isSignup ? "At least 8 characters" : "••••••••"}
            autoComplete={isSignup ? "new-password" : "current-password"}
            required
          />

          {error && (
            <p className="rounded-lg border border-danger/40 bg-danger/10 px-3 py-2 text-xs text-danger">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="display mt-1 flex items-center justify-center rounded-xl bg-accent px-4 py-3 text-sm text-black transition hover:brightness-110 disabled:opacity-50"
          >
            {loading ? "Please wait…" : isSignup ? "Create account →" : "Log in →"}
          </button>
        </form>

        <p className="mt-6 text-sm text-muted">
          {isSignup ? "Already have an account? " : "New to GitStand? "}
          <Link
            href={isSignup ? "/login" : "/signup"}
            className="font-semibold text-accent hover:underline"
          >
            {isSignup ? "Log in" : "Create one"}
          </Link>
        </p>
      </div>
    </div>
  );
}

function Field({
  label,
  type,
  value,
  onChange,
  placeholder,
  autoComplete,
  required,
}: {
  label: string;
  type: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  autoComplete?: string;
  required?: boolean;
}) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-xs font-medium text-muted">{label}</span>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        autoComplete={autoComplete}
        required={required}
        className="rounded-xl border border-border bg-black/40 px-3 py-2.5 text-sm text-foreground placeholder:text-muted/60 focus:border-accent"
      />
    </label>
  );
}
