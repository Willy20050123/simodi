// import { prisma } from "@/src/lib/prisma";

// export const runtime = "nodejs";

// export async function GET() {
//   const now = new Date();

//   const vehicles = await prisma.vehicle.findMany({
//     include: {
//       usages: {
//         where: { status: { in: ["PENDING", "ACTIVE"] } },
//         orderBy: { createdAt: "desc" },
//         take: 10,
//         include: { user: { select: { id: true, name: true, nip: true } } },
//       },
//     },
//   });

//   const result = vehicles.map((v) => {
//     const active = v.usages.find((u) => u.status === "ACTIVE") ?? null;
//     const pending = v.usages.find((u) => u.status === "PENDING") ?? null;

//     const tersedia = !v.dalamPerbaikan && !active && !pending;

//     return {
//       id: v.id,
//       merk: v.merk,
//       tahun: v.tahun,
//       warna: v.warna,
//       nomorPolisi: v.nomorPolisi,
//       dalamPerbaikan: v.dalamPerbaikan,

//       tersedia,

//       activeUsage: active
//         ? {
//             usageId: active.id,
//             byName: active.user.name,
//             byNip: active.user.nip,
//           }
//         : null,

//       pendingRequest: pending
//         ? {
//             usageId: pending.id,
//             byName: pending.user.name,
//             byNip: pending.user.nip,
//           }
//         : null,
//     };
//   });

//   return Response.json({ vehicles: result });
// }
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/src/lib/prisma";
import { requireAuth } from "@/src/lib/apiAuth";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  try {
    await requireAuth(req);

    const now = new Date();

    const vehicles = await prisma.vehicle.findMany({
      where: { deletedAt: null },
      orderBy: { id: "asc" },
      select: {
        id: true,
        merk: true,
        tahun: true,
        warna: true,
        nomorPolisi: true,
        dalamPerbaikan: true,
        usages: {
          where: {
            OR: [
              { status: "PENDING" },
              {
                status: "APPROVED",
                startAt: { lte: now },
                OR: [{ endAt: null }, { endAt: { gt: now } }],
              },
              {
                status: "ACTIVE",
                startAt: { lte: now },
                OR: [{ endAt: null }, { endAt: { gt: now } }],
              },
            ],
          },
          orderBy: { createdAt: "desc" },
          take: 1,
          select: {
            id: true,
            status: true,
            userId: true,
            startAt: true,
            endAt: true,
            user: { select: { name: true, nip: true } },
          },
        },
      },
    });

    const maintenanceIds = vehicles
      .filter((v) => v.dalamPerbaikan)
      .map((v) => v.id);

    const maintenanceReasonById = new Map<number, string>();
    if (maintenanceIds.length > 0) {
      const logs = await prisma.auditLog.findMany({
        where: {
          entity: "VEHICLE",
          entityId: { in: maintenanceIds },
          action: "USER_UPDATED",
        },
        orderBy: { createdAt: "desc" },
        take: 500,
        select: { entityId: true, metadata: true },
      });

      for (const log of logs) {
        if (maintenanceReasonById.has(log.entityId)) continue;
        const meta =
          log.metadata && typeof log.metadata === "object"
            ? (log.metadata as Record<string, unknown>)
            : null;
        const kind = meta?.kind;
        const reason = meta?.reason;
        if (kind === "MAINTENANCE_START" && typeof reason === "string") {
          maintenanceReasonById.set(log.entityId, reason);
        }
      }
    }

    const mapped = vehicles.map((v) => {
      const u = v.usages[0] ?? null;

      const dipakai = u?.status === "ACTIVE";
      const reserved = u?.status === "APPROVED";
      const pending = u?.status === "PENDING";

      const tersedia = !v.dalamPerbaikan && !dipakai && !reserved;

      return {
        id: v.id,
        merk: v.merk,
        tahun: v.tahun,
        warna: v.warna,
        nomorPolisi: v.nomorPolisi,
        dalamPerbaikan: v.dalamPerbaikan,
        maintenanceReason: maintenanceReasonById.get(v.id) ?? null,
        tersedia,
        dipakai,
        pendingRequest: pending
          ? { usageId: u!.id, byName: u!.user.name, byNip: u!.user.nip }
          : null,
        reservedUsage: reserved
          ? { id: u!.id, userId: u!.userId, byName: u!.user.name, byNip: u!.user.nip }
          : null,
        activeUsage: dipakai
          ? {
              id: u!.id,
              userId: u!.userId,
              startAt: u!.startAt,
              byName: u!.user.name,
              byNip: u!.user.nip,
            }
          : null,
      };
    });

    return NextResponse.json({ ok: true, data: mapped, vehicles: mapped });
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
