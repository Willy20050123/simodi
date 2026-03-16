import { prisma } from "@/src/lib/prisma";
import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { signAuthToken } from "@/src/lib/auth";
export const runtime = "nodejs";

const MAX_AGE = 60 * 60 * 24 * 7;
export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const nip = String(body?.nip ?? "").trim();
    const password = String(body?.password ?? "");
    if (!nip || !password) {
      return NextResponse.json(
        { error: "Data tidak lengkap" },
        { status: 400 },
      );
    }
    const user = await prisma.user.findFirst({
      where: { nip, deletedAt: null },
      select: {
        id: true,
        name: true,
        nip: true,
        fungsi: true,
        posisi: true,
        passhash: true,
        role: true,
      },
    });
    if (!user || !user.passhash) {
      return NextResponse.json({ error: "Informasi salah" }, { status: 401 });
    }
    const valid = await bcrypt.compare(password, user.passhash);
    if (!valid) {
      return NextResponse.json({ error: "Informasi salah" }, { status: 401 });
    }
    const token = await signAuthToken({
      sub: String(user.id),
      nip: user.nip,
      name: user.name,
      posisi: user.posisi,
      fungsi: user.fungsi,
      role: user.role,
    });
    const response = NextResponse.json({
      message: "Login successful",
      user: {
        id: user.id,
        nip: user.nip,
        posisi: user.posisi,
        fungsi: user.fungsi,
      },
    });
    response.cookies.set("auth", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: MAX_AGE,
    });
    return response;
  } catch (err: any) {
    return NextResponse.json(
      {
        error: "Login route crashed",
        ...(process.env.NODE_ENV !== "production"
          ? { detail: err?.message ?? String(err) }
          : {}),
      },
      { status: 500 },
    );
  }
}
