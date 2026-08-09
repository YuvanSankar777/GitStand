import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import type { Standup } from "@/lib/types";

export const runtime = "nodejs";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const rows = await prisma.standup.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
    take: 20,
  });

  const standups = rows.map((r) => ({
    id: r.id,
    createdAt: r.createdAt.toISOString(),
    format: r.format,
    standup: JSON.parse(r.generatedJson) as Standup,
  }));
  return NextResponse.json({ standups });
}

export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  try {
    const { standup, format, rawInput } = (await req.json()) as {
      standup: Standup;
      format?: string;
      rawInput?: string;
    };
    if (!standup) return NextResponse.json({ error: "Missing standup" }, { status: 400 });

    const row = await prisma.standup.create({
      data: {
        userId: user.id,
        generatedJson: JSON.stringify(standup),
        format: format || "bullets",
        rawInput: (rawInput || "").slice(0, 10000),
      },
    });
    return NextResponse.json({ id: row.id, createdAt: row.createdAt.toISOString() });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Save failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
