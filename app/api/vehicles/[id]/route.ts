import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { prisma } from "@/src/lib/prisma";
import { requireAdmin } from "@/src/lib/apiAuth";

const BLOCKING_STATUSES = ["PENDING", "APPROVED", "ACTIVE"] as const;

async function parseVehicleId(
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

  const { id, rawId } = await parseVehicleId(req, ctx);
  if (!Number.isInteger(id) || id <= 0) {
    return NextResponse.json(
      {
        error: "Invalid vehicle id (must be numeric).",
        got: rawId,
        path: req.nextUrl.pathname,
      },
      { status: 400 },
    );
  }

  const vehicle = await prisma.vehicle.findFirst({
    where: { id, deletedAt: null },
    select: { id: true, dalamPerbaikan: true, merk: true, nomorPolisi: true },
  });

  if (!vehicle) {
    return NextResponse.json({ error: "Vehicle not found" }, { status: 404 });
  }

  if (vehicle.dalamPerbaikan) {
    return NextResponse.json(
      { error: "Vehicle is in maintenance" },
      { status: 409 },
    );
  }

  const blockingUsage = await prisma.vehicleUsage.findFirst({
    where: { vehicleId: id, status: { in: [...BLOCKING_STATUSES] } },
    select: { id: true, status: true },
  });

  if (blockingUsage) {
    return NextResponse.json(
      { error: "Vehicle has active/pending usage", usage: blockingUsage },
      { status: 409 },
    );
  }

  try {
    await prisma.$transaction(async (tx) => {
      await tx.vehicle.update({
        where: { id },
        data: { deletedAt: new Date() },
      });

      await tx.auditLog.create({
        data: {
          actorId: me.id,
          action: "USER_UPDATED",
          entity: "VEHICLE",
          entityId: id,
          message: "Vehicle soft-deleted",
          metadata: {
            kind: "VEHICLE_SOFT_DELETED",
            merk: vehicle.merk,
            nomorPolisi: vehicle.nomorPolisi,
          },
        },
      });
    });
  } catch (e: any) {
    if (e?.code === "P2003") {
      return NextResponse.json(
        {
          error:
            "Vehicle masih direferensikan data lain (FK), tidak bisa dihapus.",
        },
        { status: 409 },
      );
    }
    throw e;
  }

  return NextResponse.json({ ok: true, id });
}

export async function POST(
  req: NextRequest,
  ctx: { params: Promise<{ id?: string }> },
) {
  const me = await requireAdmin(req);

  const { id, rawId } = await parseVehicleId(req, ctx);

  if (!Number.isInteger(id) || id <= 0) {
    return NextResponse.json(
      { error: "Invalid vehicle id (must be numeric).", got: rawId },
      { status: 400 },
    );
  }

  const body = await req.json().catch(() => ({}));
  const mode = String(body?.mode ?? "").toUpperCase();
  const reason =
    typeof body?.reason === "string" ? body.reason.trim() : "";

  if (mode !== "START" && mode !== "END") {
    return NextResponse.json({ error: "Invalid mode" }, { status: 400 });
  }

  const vehicle = await prisma.vehicle.findFirst({
    where: { id, deletedAt: null },
    select: { id: true, dalamPerbaikan: true, merk: true, nomorPolisi: true },
  });

  if (!vehicle) {
    return NextResponse.json({ error: "Vehicle not found" }, { status: 404 });
  }

  if (mode === "START") {
    if (reason.length < 3) {
      return NextResponse.json(
        { error: "Alasan maintenance minimal 3 karakter" },
        { status: 400 },
      );
    }

    if (vehicle.dalamPerbaikan) {
      return NextResponse.json(
        { error: "Vehicle already in maintenance" },
        { status: 409 },
      );
    }

    const blockingUsage = await prisma.vehicleUsage.findFirst({
      where: {
        vehicleId: id,
        status: { in: ["PENDING", "APPROVED", "ACTIVE"] },
      },
      select: { id: true, status: true },
    });

    if (blockingUsage) {
      return NextResponse.json(
        { error: "Vehicle has pending/approved/active usage", usage: blockingUsage },
        { status: 409 },
      );
    }

    await prisma.$transaction(async (tx) => {
      await tx.vehicle.update({
        where: { id },
        data: { dalamPerbaikan: true },
      });

      await tx.auditLog.create({
        data: {
          actorId: me.id,
          action: "USER_UPDATED",
          entity: "VEHICLE",
          entityId: id,
          message: "Vehicle set to maintenance",
          metadata: {
            kind: "MAINTENANCE_START",
            reason,
            merk: vehicle.merk,
            nomorPolisi: vehicle.nomorPolisi,
          },
        },
      });
    });

    return NextResponse.json({ ok: true, id, dalamPerbaikan: true, reason });
  }

  if (!vehicle.dalamPerbaikan) {
    return NextResponse.json(
      { error: "Vehicle is not in maintenance" },
      { status: 409 },
    );
  }

  await prisma.$transaction(async (tx) => {
    await tx.vehicle.update({
      where: { id },
      data: { dalamPerbaikan: false },
    });

    await tx.auditLog.create({
      data: {
        actorId: me.id,
        action: "USER_UPDATED",
        entity: "VEHICLE",
        entityId: id,
        message: "Vehicle maintenance completed",
        metadata: {
          kind: "MAINTENANCE_END",
          merk: vehicle.merk,
          nomorPolisi: vehicle.nomorPolisi,
        },
      },
    });
  });

  return NextResponse.json({ ok: true, id, dalamPerbaikan: false });
}
