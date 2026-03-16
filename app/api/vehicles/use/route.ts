import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/src/lib/prisma";
import { verifyAuthToken } from "@/src/lib/auth";
import { notifyAllAdmins } from "@/src/lib/notifLog";

function isValidDate(d: Date) {
  return d instanceof Date && !Number.isNaN(d.getTime());
}

function toEndOrFarFuture(d: Date | null) {
  return d ?? new Date("9999-12-31T23:59:59.000Z");
}

export async function POST(req: NextRequest) {
  try {
    const token = req.cookies.get("auth")?.value;
    if (!token)
      return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });

    const me = await verifyAuthToken(token);
    const userId = Number(me.sub);
    if (!userId)
      return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const vehicleId = Number(body.vehicleId);

    const rawTujuan =
      typeof body?.tujuan === "string" ? body.tujuan.trim() : "";
    const rawKeperluan =
      typeof body?.keperluan === "string" ? body.keperluan.trim() : "";
    const tujuan = rawTujuan || rawKeperluan || null;
    const keperluan = rawKeperluan || rawTujuan || null;
    const startAt = body.startAt ? new Date(String(body.startAt)) : new Date();
    const endAt = body.endAt ? new Date(String(body.endAt)) : null;

    if (!vehicleId)
      return NextResponse.json(
        { error: "vehicleId required" },
        { status: 400 },
      );
    if (!keperluan) {
      return NextResponse.json(
        { error: "keperluan required" },
        { status: 400 },
      );
    }
    if (!isValidDate(startAt))
      return NextResponse.json({ error: "invalid startAt" }, { status: 400 });
    if (endAt && !isValidDate(endAt))
      return NextResponse.json({ error: "invalid endAt" }, { status: 400 });
    if (endAt && !(startAt < endAt)) {
      return NextResponse.json(
        { error: "startAt must be before endAt" },
        { status: 400 },
      );
    }

    const vehicle = await prisma.vehicle.findFirst({
      where: { id: vehicleId, deletedAt: null },
      select: { id: true, merk: true, nomorPolisi: true, dalamPerbaikan: true },
    });
    if (!vehicle)
      return NextResponse.json({ error: "vehicle not found" }, { status: 404 });
    if (vehicle.dalamPerbaikan)
      return NextResponse.json(
        { error: "vehicle in maintenance" },
        { status: 409 },
      );

    const created = await prisma.$transaction(async (tx) => {
      const reqEnd = toEndOrFarFuture(endAt);

      // konflik jika ada usage yang overlap waktu request
      // overlap: existing.start < reqEnd AND existing.end > reqStart
      const conflict = await tx.vehicleUsage.findFirst({
        where: {
          vehicleId,
          status: { in: ["PENDING", "APPROVED", "ACTIVE"] },
          startAt: { lt: reqEnd },
          OR: [
            { endAt: null }, // open-ended existing blocks everything after start
            { endAt: { gt: startAt } },
          ],
        },
        select: { id: true, status: true, startAt: true, endAt: true },
      });

      if (conflict) {
        // rollback tx
        throw new Error("SCHEDULE_CONFLICT");
      }

      const usage = await tx.vehicleUsage.create({
        data: {
          userId,
          vehicleId,
          tujuan,
          keperluan,
          startAt,
          endAt,
          status: "PENDING",
        },
        include: { user: { select: { name: true, nip: true } } },
      });

      await tx.auditLog.create({
        data: {
          actorId: userId,
          action: "REQUEST_CREATED",
          entity: "VEHICLE_USAGE",
          entityId: usage.id,
          message: "User created a borrow request",
          metadata: {
            vehicleId,
            startAt: usage.startAt,
            endAt: usage.endAt,
            tujuan: usage.tujuan,
            keperluan: usage.keperluan,
          },
        },
      });

      await notifyAllAdmins(
        {
          type: "REQUEST_CREATED",
          title: "Request peminjaman baru",
          message: `${usage.user.name} (${usage.user.nip}) mengajukan ${vehicle.merk} (${vehicle.nomorPolisi})`,
          href: `/requests/${usage.id}`,
        },
        { tx },
      );

      return usage;
    });

    return NextResponse.json(
      { ok: true, usageId: created.id },
      { status: 201 },
    );
  } catch (e: any) {
    if (e?.message === "SCHEDULE_CONFLICT") {
      return NextResponse.json(
        { error: "vehicle has conflicting request/usage" },
        { status: 409 },
      );
    }
    return NextResponse.json({ error: e?.message ?? "ERROR" }, { status: 500 });
  }
}
