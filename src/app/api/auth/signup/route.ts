import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { hashPassword, setSessionCookie } from "@/lib/auth";

export const runtime = "nodejs";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(req: Request) {
  try {
    const { email, password, name } = (await req.json()) as {
      email?: string;
      password?: string;
      name?: string;
    };

    const cleanEmail = (email || "").trim().toLowerCase();
    if (!EMAIL_RE.test(cleanEmail)) {
      return NextResponse.json({ error: "Enter a valid email address." }, { status: 400 });
    }
    if (!password || password.length < 8) {
      return NextResponse.json({ error: "Password must be at least 8 characters." }, { status: 400 });
    }

    const existing = await prisma.user.findUnique({ where: { email: cleanEmail } });
    if (existing) {
      return NextResponse.json({ error: "An account with that email already exists." }, { status: 409 });
    }

    const user = await prisma.user.create({
      data: {
        email: cleanEmail,
        passwordHash: await hashPassword(password),
        name: name?.trim() || null,
      },
      select: { id: true, email: true, name: true },
    });

    await setSessionCookie(user.id);
    return NextResponse.json({ user });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Signup failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
