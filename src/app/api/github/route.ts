import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";

export const runtime = "nodejs";

/** Accepts "owner/repo", a full github.com URL, or "github.com/owner/repo". */
function parseRepo(input: string): { owner: string; repo: string } | null {
  const cleaned = input.trim().replace(/\.git$/, "");
  const urlMatch = cleaned.match(/github\.com[/:]([^/]+)\/([^/]+)/i);
  if (urlMatch) return { owner: urlMatch[1], repo: urlMatch[2] };
  const slug = cleaned.match(/^([^/\s]+)\/([^/\s]+)$/);
  if (slug) return { owner: slug[1], repo: slug[2] };
  return null;
}

export async function POST(req: Request) {
  try {
    if (!(await getCurrentUser())) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }
    const { repo, author, since, until } = (await req.json()) as {
      repo: string;
      author?: string;
      since?: string;
      until?: string;
    };

    const parsed = parseRepo(repo || "");
    if (!parsed) {
      return NextResponse.json(
        { error: "Enter a repo as owner/name or a github.com URL." },
        { status: 400 },
      );
    }

    const params = new URLSearchParams({ per_page: "40" });
    if (author) params.set("author", author);
    if (since) params.set("since", since);
    if (until) params.set("until", until);

    const url = `https://api.github.com/repos/${parsed.owner}/${parsed.repo}/commits?${params}`;
    const headers: Record<string, string> = {
      Accept: "application/vnd.github+json",
      "X-GitHub-Api-Version": "2022-11-28",
    };
    if (process.env.GITHUB_TOKEN) headers.Authorization = `Bearer ${process.env.GITHUB_TOKEN}`;

    const res = await fetch(url, { headers });
    if (!res.ok) {
      if (res.status === 404) {
        return NextResponse.json(
          { error: `Repo ${parsed.owner}/${parsed.repo} not found (private repos need GITHUB_TOKEN).` },
          { status: 404 },
        );
      }
      if (res.status === 403) {
        return NextResponse.json(
          { error: "GitHub rate limit hit. Add GITHUB_TOKEN to .env.local for higher limits." },
          { status: 403 },
        );
      }
      const detail = await res.text().catch(() => "");
      return NextResponse.json({ error: `GitHub ${res.status}: ${detail.slice(0, 200)}` }, { status: 502 });
    }

    const data = (await res.json()) as Array<{
      sha: string;
      commit: { message: string; author?: { name?: string; date?: string } };
    }>;

    // Render as `git log --oneline`-style text so it flows through the existing parser.
    const lines = data.map((c) => `${c.sha.slice(0, 7)} ${c.commit.message.split("\n")[0]}`);
    return NextResponse.json({
      repo: `${parsed.owner}/${parsed.repo}`,
      count: lines.length,
      log: lines.join("\n"),
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
