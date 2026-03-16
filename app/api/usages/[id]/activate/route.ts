import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { prisma } from "@/src/lib/prisma";
import { requireAdmin } from "@/src/lib/apiAuth";
import { authErrorToResponse } from "@/src/lib/httpAuth";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const me = await requireAdmin(req);
    const { id } = await params;

    const raw = String(id ?? "").trim();
    const usageId = Number.parseInt(raw, 10);

    if (!Number.isInteger(usageId) || usageId <= 0) {
      return NextResponse.json(
        { error: "Invalid usage id", got: raw },
        { status: 400 },
      );
    }

    const usage = await prisma.vehicleUsage.findUnique({
      where: { id: usageId },
      select: { id: true, status: true, userId: true, vehicleId: true },
    });

    if (!usage) {
      return NextResponse.json({ error: "Request not found" }, { status: 404 });
    }

    if (usage.status !== "APPROVED") {
      return NextResponse.json(
        { error: "Only APPROVED can be activated", status: usage.status },
        { status: 409 },
      );
    }

    const conflict = await prisma.vehicleUsage.findFirst({
      where: { vehicleId: usage.vehicleId, status: "ACTIVE" },
      select: { id: true },
    });

    if (conflict) {
      return NextResponse.json(
        { error: "Vehicle already ACTIVE" },
        { status: 409 },
      );
    }

    const updated = await prisma.vehicleUsage.update({
      where: { id: usageId },
      data: { status: "ACTIVE" },
      select: { id: true, status: true, userId: true },
    });

    await prisma.notification.create({
      data: {
        userId: updated.userId,
        type: "REQUEST_APPROVED",
        title: "Peminjaman dimulai",
        message: "Kunci sudah diambil. Status sekarang ACTIVE.",
        href: `/requests/${updated.id}`,
      },
    });

    await prisma.auditLog.create({
      data: {
        actorId: me.id,
        action: "USAGE_ACTIVATED",
        entity: "VEHICLE_USAGE",
        entityId: updated.id,
        message: "Usage activated",
      },
    });

    return NextResponse.json({ ok: true, usage: updated });
  } catch (e) {
    return authErrorToResponse(e);
  }
}