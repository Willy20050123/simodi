import { prisma } from "@/src/lib/prisma";
import { cookies } from "next/headers";
import { verifyAuthToken } from "@/src/lib/auth";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const token = (await cookies()).get("auth")?.value;
  if (!token) return Response.json({ error: "UNAUTHORIZED" }, { status: 401 });

  const me = await verifyAuthToken(token);
  if (me?.role !== "ADMIN")
    return Response.json({ error: "FORBIDDEN" }, { status: 403 });

  const adminId = Number(me.sub);

  const body = await req.json().catch(() => ({}));
  const usageId = Number(body.usageId);
  const action = String(body.action ?? "").toUpperCase();
  const reason = body.reason ? String(body.reason).trim() : null;

  if (!usageId)
    return Response.json({ error: "usageId required" }, { status: 400 });
  if (action !== "APPROVE" && action !== "REJECT") {
    return Response.json({ error: "Invalid action" }, { status: 400 });
  }
  if (action === "REJECT" && (!reason || reason.length < 3)) {
    return Response.json({ error: "Reject reason required" }, { status: 400 });
  }

  try {
    const out = await prisma.$transaction(async (tx) => {
      const usage = await tx.vehicleUsage.findUnique({
        where: { id: usageId },
        include: {
          user: { select: { id: true, name: true, nip: true } },
          vehicle: {
            select: {
              id: true,
              merk: true,
              nomorPolisi: true,
              dalamPerbaikan: true,
            },
          },
        },
      });

      if (!usage) return { kind: "NOT_FOUND" as const };
      if (usage.status !== "PENDING")
        return { kind: "INVALID_STATUS" as const, status: usage.status };
      if (usage.vehicle.dalamPerbaikan) return { kind: "MAINTENANCE" as const };

      if (action === "APPROVE") {
        const reqStart = usage.startAt;
        const reqEnd = usage.endAt ?? new Date("9999-12-31T23:59:59.000Z");

        const conflict = await tx.vehicleUsage.findFirst({
          where: {
            vehicleId: usage.vehicleId,
            id: { not: usage.id },
            status: { in: ["APPROVED", "ACTIVE"] },
            startAt: { lt: reqEnd },
            OR: [{ endAt: null }, { endAt: { gt: reqStart } }],
          },
          select: { id: true, status: true },
        });

        if (conflict) return { kind: "CONFLICT" as const, conflict };
      }

      const now = new Date();

      const updated =
        action === "APPROVE"
          ? await tx.vehicleUsage.update({
              where: { id: usageId },
              data: {
                status: "APPROVED",
                approvedById: adminId,
                approvedAt: now,
                rejectedAt: null,
                rejectReason: null,
              },
              select: { id: true, status: true },
            })
          : await tx.vehicleUsage.update({
              where: { id: usageId },
              data: {
                status: "REJECTED",
                rejectedAt: now,
                rejectReason: reason,
              },
              select: { id: true, status: true },
            });

      await tx.auditLog.create({
        data: {
          actorId: adminId,
          action:
            action === "APPROVE" ? "REQUEST_APPROVED" : "REQUEST_REJECTED",
          entity: "VEHICLE_USAGE",
          entityId: usageId,
          message:
            action === "APPROVE"
              ? "Admin approved request"
              : "Admin rejected request",
          metadata: {
            reason: reason ?? null,
            vehicleId: usage.vehicleId,
            userId: usage.userId,
          },
        },
      });

      await tx.notification.create({
        data: {
          userId: usage.userId,
          type: action === "APPROVE" ? "REQUEST_APPROVED" : "REQUEST_REJECTED",
          title: action === "APPROVE" ? "Request disetujui" : "Request ditolak",
          message:
            action === "APPROVE"
              ? `Request peminjaman ${usage.vehicle.merk} (${usage.vehicle.nomorPolisi}) disetujui.`
              : `Request peminjaman ${usage.vehicle.merk} (${usage.vehicle.nomorPolisi}) ditolak. Alasan: ${reason}`,
          href: `/requests/${usage.id}`,
        },
      });

      return { kind: "OK" as const, updated };
    });

    if (out.kind === "NOT_FOUND")
      return Response.json({ error: "NOT_FOUND" }, { status: 404 });
    if (out.kind === "INVALID_STATUS")
      return Response.json(
        { error: "INVALID_STATUS", status: out.status },
        { status: 409 },
      );
    if (out.kind === "MAINTENANCE")
      return Response.json({ error: "VEHICLE_MAINTENANCE" }, { status: 409 });
    if (out.kind === "CONFLICT")
      return Response.json(
        { error: "SCHEDULE_CONFLICT", conflict: out.conflict },
        { status: 409 },
      );

    return Response.json({ ok: true, data: out.updated });
  } catch (e: any) {
    return Response.json({ error: e?.message ?? "ERROR" }, { status: 500 });
  }
}
