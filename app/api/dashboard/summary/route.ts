import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/src/lib/prisma";
import { requireAuth } from "@/src/lib/apiAuth";

export const runtime = "nodejs";

function endOrFarFuture(endAt: Date | null) {
  return endAt ?? new Date("9999-12-31T23:59:59.000Z");
}

export async function GET(req: NextRequest) {
  try {
    await requireAuth(req);

    const now = new Date();

    const total = await prisma.vehicle.count({
      where: { deletedAt: null },
    });

    const maintenance = await prisma.vehicle.count({
      where: { dalamPerbaikan: true, deletedAt: null },
    });

    // kendaraan yang lagi ACTIVE sekarang
    const activeVehicleIds = await prisma.vehicleUsage.findMany({
      where: {
        vehicle: { deletedAt: null },
        status: "ACTIVE",
        startAt: { lte: now },
        OR: [{ endAt: null }, { endAt: { gt: now } }],
      },
      select: { vehicleId: true },
      distinct: ["vehicleId"],
    });

    const approvedVehicleIds = await prisma.vehicleUsage.findMany({
      where: {
        vehicle: { deletedAt: null },
        status: "APPROVED",
        startAt: { lte: now },
        OR: [{ endAt: null }, { endAt: { gt: now } }],
      },
      select: { vehicleId: true },
      distinct: ["vehicleId"],
    });

    const activeCount = activeVehicleIds.length;
    const approvedCount = approvedVehicleIds.length;

    const pendingCount = await prisma.vehicleUsage.count({
      where: { status: "PENDING", vehicle: { deletedAt: null } },
    });

    const available = Math.max(
      0,
      total - maintenance - activeCount - approvedCount,
    );

    return NextResponse.json({
      ok: true,
      data: {
        total,
        available,
        active: activeCount,
        reserved: approvedCount,
        maintenance,
        pending: pendingCount,
      },
    });
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
