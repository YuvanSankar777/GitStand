import { NextResponse } from "next/server";

export const runtime = "nodejs";

/**
 * Posts a standup to Slack via an incoming webhook.
 * Webhook URL comes from SLACK_WEBHOOK_URL (preferred) or the request body.
 */
export async function POST(req: Request) {
  try {
    const { text, webhook } = (await req.json()) as { text: string; webhook?: string };
    if (!text?.trim()) {
      return NextResponse.json({ error: "Nothing to post." }, { status: 400 });
    }

    const url = process.env.SLACK_WEBHOOK_URL || webhook;
    if (!url) {
      return NextResponse.json(
        { error: "not_configured", detail: "Set SLACK_WEBHOOK_URL in .env.local to enable posting." },
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
