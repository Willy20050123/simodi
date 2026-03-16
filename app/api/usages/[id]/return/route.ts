import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/src/lib/prisma";
import { requireAuth } from "@/src/lib/apiAuth";

export const runtime = "nodejs";

export async function POST(
  req: NextRequest,
  ctx: { params: Promise<{ id?: string }> },
) {
  try {
    const me = await requireAuth(req);

    const { id } = await ctx.params;
    const usageId = Number.parseInt(String(id ?? ""), 10);
    if (!Number.isInteger(usageId) || usageId <= 0) {
      return NextResponse.json(
        { ok: false, error: "Invalid usage id" },
        { status: 400 },
      );
    }

    const usage = await prisma.vehicleUsage.findUnique({
      where: { id: usageId },
      select: { id: true, status: true, userId: true },
    });

    if (!usage)
      return NextResponse.json(
        { ok: false, error: "NOT_FOUND" },
        { status: 404 },
      );

    // hanya owner (atau admin, kalau lu mau) boleh return
    if (usage.userId !== me.id && me.role !== "ADMIN") {
      return NextResponse.json(
        { ok: false, error: "FORBIDDEN" },
        { status: 403 },
      );
    }

    if (usage.status !== "ACTIVE" && usage.status !== "APPROVED") {
      return NextResponse.json(
        { ok: false, error: "INVALID_STATUS", status: usage.status },
        { status: 409 },
      );
    }

    const updated = await prisma.$transaction(async (tx) => {
      const done = await tx.vehicleUsage.update({
        where: { id: usageId },
        data: { status: "COMPLETED", endAt: new Date() },
        select: { id: true, status: true },
      });

      await tx.auditLog.create({
        data: {
          actorId: me.id,
          action: "USAGE_COMPLETED",
          entity: "VEHICLE_USAGE",
          entityId: done.id,
          message: "Vehicle usage completed/returned",
        },
      });

      return done;
    });

    return NextResponse.json({ ok: true, data: updated });
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
