import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { prisma } from "@/src/lib/prisma";
import { requireAdmin } from "@/src/lib/apiAuth";
import { authErrorToResponse } from "@/src/lib/httpAuth";
import { AuditAction, AuditEntity } from "@prisma/client";

const BORROW_ACTIONS: AuditAction[] = [
  AuditAction.REQUEST_CREATED,
  AuditAction.REQUEST_APPROVED,
  AuditAction.REQUEST_REJECTED,
  AuditAction.USAGE_ACTIVATED,
  AuditAction.USAGE_COMPLETED,
];

export async function GET(req: NextRequest) {
  try {
    await requireAdmin(req);
    const rawTake = Number(req.nextUrl.searchParams.get("take") ?? "200");
    const take = Number.isFinite(rawTake)
      ? Math.min(2000, Math.max(1, Math.trunc(rawTake)))
      : 200;

    const logs = await prisma.auditLog.findMany({
      where: {
        OR: [
          {
            entity: AuditEntity.VEHICLE_USAGE,
            action: { in: BORROW_ACTIONS },
          },
          {
            entity: AuditEntity.VEHICLE,
            action: AuditAction.USER_UPDATED,
          },
        ],
      },
      orderBy: { createdAt: "desc" },
      take,
      include: {
        actor: {
          select: { id: true, name: true, nip: true },
        },
      },
    });

    const usageIds = Array.from(
      new Set(logs.filter((x) => x.entity === "VEHICLE_USAGE").map((x) => x.entityId)),
    );
    const vehicleIds = Array.from(
      new Set(logs.filter((x) => x.entity === "VEHICLE").map((x) => x.entityId)),
    );

    const usages = usageIds.length
      ? await prisma.vehicleUsage.findMany({
          where: { id: { in: usageIds } },
          select: {
            id: true,
            status: true,
            tujuan: true,
            keperluan: true,
            user: { select: { id: true, name: true, nip: true } },
            vehicle: { select: { id: true, merk: true, nomorPolisi: true } },
          },
        })
      : [];
    const vehicles = vehicleIds.length
      ? await prisma.vehicle.findMany({
          where: { id: { in: vehicleIds } },
          select: { id: true, merk: true, nomorPolisi: true },
        })
      : [];

    const usageById = new Map(usages.map((u) => [u.id, u]));
    const vehicleById = new Map(vehicles.map((v) => [v.id, v]));

    const data = logs.map((l) => {
      const u = l.entity === "VEHICLE_USAGE" ? usageById.get(l.entityId) : undefined;
      const v = vehicleById.get(l.entityId);
      const meta =
        l.metadata && typeof l.metadata === "object"
          ? (l.metadata as Record<string, unknown>)
          : null;
      const maintenanceKind =
        meta && typeof meta.kind === "string" ? meta.kind : null;
      const maintenanceReason =
        meta && typeof meta.reason === "string" ? meta.reason : null;

      return {
        id: l.id,
        createdAt: l.createdAt,
        action: l.action,
        entity: l.entity,
        message: l.message,
        actor: l.actor,
        usageId: l.entity === "VEHICLE_USAGE" ? l.entityId : null,
        usageStatus: l.entity === "VEHICLE_USAGE" ? (u?.status ?? null) : null,
        pemohon: l.entity === "VEHICLE_USAGE" ? (u?.user ?? null) : null,
        kendaraan:
          l.entity === "VEHICLE_USAGE"
            ? (u?.vehicle ?? null)
            : v
              ? { id: v.id, merk: v.merk, nomorPolisi: v.nomorPolisi }
              : null,
        tujuan: u?.tujuan ?? null,
        keperluan: u?.keperluan ?? null,
        maintenanceKind,
        maintenanceReason,
      };
    });

    return NextResponse.json({ ok: true, data });
  } catch (e) {
    return authErrorToResponse(e);
  }
}
