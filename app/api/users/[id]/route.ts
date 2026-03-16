import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { prisma } from "@/src/lib/prisma";
import { requireAdmin } from "@/src/lib/apiAuth";
import bcrypt from "bcryptjs";

async function parseId(
  req: NextRequest,
  ctx: { params: Promise<{ id?: string }> },
) {
  const { id: idFromParams } = await ctx.params;
  const fromParams = typeof idFromParams === "string" ? idFromParams : "";
  const fromPath = req.nextUrl.pathname.split("/").filter(Boolean).pop() ?? "";
  const rawId = decodeURIComponent((fromParams || fromPath).trim());
  const id = Number.parseInt(rawId, 10);
  return { id, rawId };
}

export async function DELETE(
  req: NextRequest,
  ctx: { params: Promise<{ id?: string }> },
) {
  const me = await requireAdmin(req);

  const { id, rawId } = await parseId(req, ctx);
  if (!Number.isInteger(id) || id <= 0) {
    return NextResponse.json(
      {
        error: "Invalid user id (must be numeric).",
        got: rawId,
        path: req.nextUrl.pathname,
      },
      { status: 400 },
    );
  }

  const target = await prisma.user.findFirst({
    where: { id, deletedAt: null },
    select: { id: true, role: true },
  });

  if (!target) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  if (me.id === id) {
    return NextResponse.json(
      { error: "Tidak boleh menghapus akun sendiri." },
      { status: 409 },
    );
  }

  await prisma.notification.deleteMany({ where: { userId: id } });
  await prisma.auditLog.updateMany({
    where: { actorId: id },
    data: { actorId: null },
  });

  await prisma.$transaction(async (tx) => {
    await tx.user.update({
      where: { id },
      data: { deletedAt: new Date() },
    });

    await tx.auditLog.create({
      data: {
        actorId: me.id,
        action: "USER_DELETED",
        entity: "USER",
        entityId: id,
        message: "User soft-deleted",
        metadata: { targetUserId: id },
      },
    });
  });

  return NextResponse.json({ ok: true, id });
}

export async function POST(
  req: NextRequest,
  ctx: { params: Promise<{ id?: string }> },
) {
  const me = await requireAdmin(req);

  const { id, rawId } = await parseId(req, ctx);
  if (!Number.isInteger(id) || id <= 0) {
    return NextResponse.json(
      { error: "Invalid user id (must be numeric).", got: rawId },
      { status: 400 },
    );
  }

  const body = await req.json().catch(() => ({}));
  const adminPassword = String(body?.adminPassword ?? "");
  const newPassword = String(body?.newPassword ?? "");
  const confirmPassword = String(body?.confirmPassword ?? "");

  if (!adminPassword || !newPassword || !confirmPassword) {
    return NextResponse.json(
      { error: "Data tidak lengkap" },
      { status: 400 },
    );
  }
  if (newPassword.length < 6) {
    return NextResponse.json(
      { error: "Password baru minimal 6 karakter" },
      { status: 400 },
    );
  }
  if (newPassword !== confirmPassword) {
    return NextResponse.json(
      { error: "Konfirmasi password tidak sama" },
      { status: 400 },
    );
  }

  if (id === me.id) {
    return NextResponse.json(
      { error: "Gunakan menu profile untuk ganti password akun sendiri." },
      { status: 409 },
    );
  }

  const [adminRow, target] = await Promise.all([
    prisma.user.findUnique({
      where: { id: me.id },
      select: { id: true, passhash: true },
    }),
    prisma.user.findFirst({
      where: { id, deletedAt: null },
      select: { id: true, name: true, nip: true },
    }),
  ]);

  if (!adminRow) {
    return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  }
  if (!target) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  const valid = await bcrypt.compare(adminPassword, adminRow.passhash);
  if (!valid) {
    return NextResponse.json(
      { error: "Password admin salah" },
      { status: 401 },
    );
  }

  const nextHash = await bcrypt.hash(newPassword, 10);

  await prisma.$transaction(async (tx) => {
    await tx.user.update({
      where: { id },
      data: { passhash: nextHash },
    });

    await tx.auditLog.create({
      data: {
        actorId: me.id,
        action: "USER_PASSWORD_RESET",
        entity: "USER",
        entityId: id,
        message: "Admin reset password user",
        metadata: {
          targetUserId: target.id,
          targetNip: target.nip,
        },
      },
    });
  });

  return NextResponse.json({ ok: true, id: target.id });
}
