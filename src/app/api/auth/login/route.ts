import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { verifyPassword, setSessionCookie } from "@/lib/auth";

export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    const { email, password } = (await req.json()) as { email?: string; password?: string };
    const cleanEmail = (email || "").trim().toLowerCase();

    const user = await prisma.user.findUnique({ where: { email: cleanEmail } });
    // Same message whether the email is unknown or the password is wrong.
    if (!user || !(await verifyPassword(password || "", user.passwordHash))) {
      return NextResponse.json({ error: "Invalid email or password." }, { status: 401 });
    }

    await setSessionCookie(user.id);
    return NextResponse.json({ user: { id: user.id, email: user.email, name: user.name } });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Login failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
