import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/src/lib/prisma";
import { requireAdmin } from "@/src/lib/apiAuth";
import { authErrorToResponse } from "@/src/lib/httpAuth";

function toEndOrFarFuture(d: Date | null) {
  return d ?? new Date("9999-12-31T23:59:59.000Z");
}

export async function POST(
  req: NextRequest,
  ctx: { params: Promise<{ id?: string }> },
) {
  try {
    const me = await requireAdmin(req);

    const { id } = await ctx.params;
    const raw = String(id ?? "").trim();
    const usageId = Number.parseInt(raw, 10);

    if (!Number.isInteger(usageId) || usageId <= 0) {
      return NextResponse.json(
        { error: "Invalid usage id", got: raw },
        { status: 400 },
      );
    }

    const body = await req.json().catch(() => ({}));
    const decision = String(body?.decision ?? "").toUpperCase();
    const rejectReason =
      typeof body?.rejectReason === "string" ? body.rejectReason.trim() : "";

    if (decision !== "APPROVE" && decision !== "REJECT") {
      return NextResponse.json({ error: "Invalid decision" }, { status: 400 });
    }
    if (decision === "REJECT" && rejectReason.length < 3) {
      return NextResponse.json(
        { error: "Reject reason required" },
        { status: 400 },
      );
    }

    const out = await prisma.$transaction(async (tx) => {
      const usage = await tx.vehicleUsage.findUnique({
        where: { id: usageId },
        select: {
          id: true,
          status: true,
          userId: true,
          vehicleId: true,
          startAt: true,
          endAt: true,
          vehicle: {
            select: { merk: true, nomorPolisi: true, dalamPerbaikan: true },
          },
        },
      });

      if (!usage) return { kind: "NOT_FOUND" as const };
      if (usage.status !== "PENDING") {
        return { kind: "ALREADY" as const, status: usage.status };
      }
      if (usage.vehicle.dalamPerbaikan) {
        return { kind: "MAINTENANCE" as const };
      }

      if (decision === "APPROVE") {
        const reqStart = usage.startAt;
        const reqEnd = toEndOrFarFuture(usage.endAt);

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

      const updated = await tx.vehicleUsage.update({
        where: { id: usageId },
        data:
          decision === "APPROVE"
            ? {
                status: "APPROVED",
                approvedById: me.id,
                approvedAt: new Date(),
                rejectedAt: null,
                rejectReason: null,
              }
            : {
                status: "REJECTED",
                approvedById: null,
                approvedAt: null,
                rejectedAt: new Date(),
                rejectReason,
              },
        select: { id: true, status: true, userId: true },
      });

      await tx.notification.create({
        data:
          decision === "APPROVE"
            ? {
                userId: updated.userId,
                type: "REQUEST_APPROVED",
                title: "Permintaan peminjaman disetujui",
                message:
                  "Permintaan kamu disetujui. Silakan ambil kunci di TU.",
                href: `/requests/${updated.id}`,
              }
            : {
                userId: updated.userId,
                type: "REQUEST_REJECTED",
                title: "Permintaan peminjaman ditolak",
                message: rejectReason,
                href: `/requests/${updated.id}`,
              },
      });

      await tx.auditLog.create({
        data: {
          actorId: me.id,
          action: decision === "APPROVE" ? "REQUEST_APPROVED" : "REQUEST_REJECTED",
          entity: "VEHICLE_USAGE",
          entityId: updated.id,
          message:
            decision === "APPROVE"
              ? "Admin approved borrow request"
              : "Admin rejected borrow request",
          metadata:
            decision === "APPROVE"
              ? Prisma.JsonNull
              : {
                  rejectReason,
                },
        },
      });

      return { kind: "OK" as const, updated };
    });

    if (out.kind === "NOT_FOUND") {
      return NextResponse.json({ error: "Request not found" }, { status: 404 });
    }

    if (out.kind === "ALREADY") {
      return NextResponse.json(
        { error: "Already processed", status: out.status },
        { status: 409 },
      );
    }

    if (out.kind === "MAINTENANCE") {
      return NextResponse.json(
        { error: "Vehicle in maintenance" },
        { status: 409 },
      );
    }

    if (out.kind === "CONFLICT") {
      return NextResponse.json(
        { error: "Vehicle has conflict", conflict: out.conflict },
        { status: 409 },
      );
    }

    return NextResponse.json({ ok: true, usage: out.updated });
  } catch (e) {
    return authErrorToResponse(e);
  }
}