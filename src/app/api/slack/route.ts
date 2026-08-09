import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";

export const runtime = "nodejs";

/**
 * Resolve which Slack channel a user's standup goes to:
 *   personal webhook  ->  company webhook  ->  global env fallback (demo).
 * A webhook is bound to one channel at creation, so this routing IS the channel.
 */
async function resolveWebhook(userId: string): Promise<string | null> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { company: true },
  });
  return (
    user?.slackWebhookURL ||
    user?.company?.slackWebhookURL ||
    process.env.SLACK_WEBHOOK_URL ||
    null
  );
}

export async function POST(req: Request) {
  try {
    const session = await getCurrentUser();
    if (!session) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }
    const { text } = (await req.json()) as { text: string };
    if (!text?.trim()) {
      return NextResponse.json({ error: "Nothing to post." }, { status: 400 });
    }

    const url = await resolveWebhook(session.id);
    if (!url) {
      return NextResponse.json(
        { error: "not_configured", detail: "Add a Slack channel in Settings to enable posting." },
        { status: 400 },
      );
    }
    if (!/^https:\/\/hooks\.slack\.com\//.test(url)) {
      return NextResponse.json({ error: "That doesn't look like a Slack incoming webhook URL." }, { status: 400 });
    }

    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text }),
    });

    if (!res.ok) {
      const detail = await res.text().catch(() => "");
      return NextResponse.json({ error: `Slack ${res.status}: ${detail.slice(0, 200)}` }, { status: 502 });
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
