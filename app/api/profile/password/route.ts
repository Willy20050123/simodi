import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/src/lib/prisma";
import { requireAuth } from "@/src/lib/apiAuth";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    const me = await requireAuth(req);

    const body = await req.json().catch(() => ({}));
    const currentPassword = String(body?.currentPassword ?? "");
    const newPassword = String(body?.newPassword ?? "");
    const confirmPassword = String(body?.confirmPassword ?? "");

    if (!currentPassword || !newPassword || !confirmPassword) {
      return NextResponse.json(
        { ok: false, error: "Data tidak lengkap" },
        { status: 400 },
      );
    }

    if (newPassword.length < 6) {
      return NextResponse.json(
        { ok: false, error: "Password baru minimal 6 karakter" },
        { status: 400 },
      );
    }

    if (newPassword !== confirmPassword) {
      return NextResponse.json(
        { ok: false, error: "Konfirmasi password tidak sama" },
        { status: 400 },
      );
    }

    if (newPassword === currentPassword) {
      return NextResponse.json(
        { ok: false, error: "Password baru harus berbeda" },
        { status: 400 },
      );
    }

    const user = await prisma.user.findUnique({
      where: { id: me.id },
      select: { id: true, passhash: true },
    });

    if (!user) {
      return NextResponse.json(
        { ok: false, error: "UNAUTHORIZED" },
        { status: 401 },
      );
    }

    const valid = await bcrypt.compare(currentPassword, user.passhash);
    if (!valid) {
      return NextResponse.json(
        { ok: false, error: "Password lama salah" },
        { status: 401 },
      );
    }

    const nextHash = await bcrypt.hash(newPassword, 10);

    await prisma.$transaction(async (tx) => {
      await tx.user.update({
        where: { id: me.id },
        data: { passhash: nextHash },
      });

      await tx.auditLog.create({
        data: {
          actorId: me.id,
          action: "USER_PASSWORD_RESET",
          entity: "USER",
          entityId: me.id,
          message: "User changed own password",
        },
      });
    });

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    if (String(e?.message) === "UNAUTHORIZED") {
      return NextResponse.json(
        { ok: false, error: "UNAUTHORIZED" },
        { status: 401 },
      );
    }

    return NextResponse.json(
      { ok: false, error: e?.message ?? "ERROR" },
      { status: 500 },
    );
  }
}

