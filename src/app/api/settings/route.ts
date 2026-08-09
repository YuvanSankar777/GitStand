import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";

export const runtime = "nodejs";

const SLACK_RE = /^https:\/\/hooks\.slack\.com\//;

export async function GET() {
  const session = await getCurrentUser();
  if (!session) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const user = await prisma.user.findUnique({
    where: { id: session.id },
    include: { company: true },
  });
  if (!user) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const resolved = user.slackWebhookURL
    ? "personal"
    : user.company?.slackWebhookURL
      ? "company"
      : process.env.SLACK_WEBHOOK_URL
        ? "env"
        : "none";

  // Never return raw webhook URLs to the client — only whether they are set.
  return NextResponse.json({
    role: user.role,
    personalConfigured: Boolean(user.slackWebhookURL),
    company: user.company
      ? {
          name: user.company.name,
          domain: user.company.domain,
          configured: Boolean(user.company.slackWebhookURL),
        }
      : null,
    resolved,
  });
}

export async function POST(req: Request) {
  const session = await getCurrentUser();
  if (!session) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  try {
    const { scope, webhookURL } = (await req.json()) as {
      scope: "personal" | "company";
      webhookURL: string | null;
    };

    const url = (webhookURL || "").trim();
    if (url && !SLACK_RE.test(url)) {
      return NextResponse.json({ error: "That isn't a Slack incoming webhook URL." }, { status: 400 });
    }
    const value = url || null; // empty string clears it

    if (scope === "personal") {
      await prisma.user.update({ where: { id: session.id }, data: { slackWebhookURL: value } });
      return NextResponse.json({ ok: true });
    }

    if (scope === "company") {
      const user = await prisma.user.findUnique({ where: { id: session.id } });
      if (!user?.companyId) {
        return NextResponse.json({ error: "You aren't part of a company." }, { status: 400 });
      }
      if (user.role !== "admin") {
        return NextResponse.json({ error: "Only a company admin can set the team channel." }, { status: 403 });
      }
      await prisma.company.update({ where: { id: user.companyId }, data: { slackWebhookURL: value } });
      return NextResponse.json({ ok: true });
    }

    return NextResponse.json({ error: "Unknown scope" }, { status: 400 });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Save failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
