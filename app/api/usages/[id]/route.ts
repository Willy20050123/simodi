import { prisma } from "@/src/lib/prisma";
import type { NextRequest } from "next/server";
import { requireAuth } from "@/src/lib/apiAuth";

export const runtime = "nodejs";

export async function GET(
  req: NextRequest,
  ctx: { params: Promise<{ id?: string }> },
) {
  try {
    await requireAuth(req);

    const { id: rawId } = await ctx.params;

    const raw = String(rawId ?? "").trim();
    const id = Number.parseInt(raw, 10);

    if (!Number.isInteger(id) || id <= 0) {
      return Response.json(
        { error: "Invalid usage id (must be numeric).", got: raw },
        { status: 400 },
      );
    }
    const me = await requireAuth(req);

    const usage = await prisma.vehicleUsage.findUnique({
      where: { id },
      select: {
        id: true,
        status: true,
        tujuan: true,
        keperluan: true,
        startAt: true,
        endAt: true,
        approvedById: true,
        approvedAt: true,
        rejectedAt: true,
        rejectReason: true,
        userId: true, // penting buat check owner
        user: { select: { id: true, name: true, nip: true } },
        vehicle: { select: { id: true, merk: true, nomorPolisi: true } },
      },
    });

    if (!usage)
      return Response.json({ ok: false, error: "NOT_FOUND" }, { status: 404 });

    if (me.role !== "ADMIN" && usage.userId !== me.id) {
      return Response.json({ ok: false, error: "FORBIDDEN" }, { status: 403 });
    }

    let fallbackTujuan: string | null = null;
    let fallbackKeperluan: string | null = null;

    if (!usage.tujuan || !usage.keperluan) {
      const createdLog = await prisma.auditLog.findFirst({
        where: {
          entity: "VEHICLE_USAGE",
          entityId: id,
          action: "REQUEST_CREATED",
        },
        orderBy: { createdAt: "asc" },
        select: { metadata: true },
      });

      const meta =
        createdLog && createdLog.metadata && typeof createdLog.metadata === "object"
          ? (createdLog.metadata as Record<string, unknown>)
          : null;

      fallbackTujuan =
        meta && typeof meta.tujuan === "string" ? meta.tujuan : null;
      fallbackKeperluan =
        meta && typeof meta.keperluan === "string" ? meta.keperluan : null;
    }

    const { userId, ...safe } = usage;
    return Response.json({
      ok: true,
      data: {
        ...safe,
        tujuan: safe.tujuan ?? fallbackTujuan,
        keperluan: safe.keperluan ?? fallbackKeperluan,
      },
    });
  } catch (e: any) {
    if (String(e?.message) === "UNAUTHORIZED") {
      return Response.json(
        { ok: false, error: "UNAUTHORIZED" },
        { status: 401 },
      );
    }
    return Response.json(
      { ok: false, error: e?.message ?? "ERROR" },
      { status: 500 },
    );
  }
}
