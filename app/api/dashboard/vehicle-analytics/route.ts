import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/src/lib/prisma";
import { requireAdmin } from "@/src/lib/apiAuth";
import { authErrorToResponse } from "@/src/lib/httpAuth";

function parseMonth(raw: string | null) {
  const now = new Date();
  const fallback = {
    year: now.getFullYear(),
    month: now.getMonth() + 1,
  };

  if (!raw) return fallback;
  const m = /^(\d{4})-(\d{2})$/.exec(raw.trim());
  if (!m) return fallback;

  const year = Number(m[1]);
  const month = Number(m[2]);
  if (!Number.isInteger(year) || !Number.isInteger(month) || month < 1 || month > 12) {
    return fallback;
  }
  return { year, month };
}

export async function GET(req: NextRequest) {
  try {
    await requireAdmin(req);

    const monthParam = req.nextUrl.searchParams.get("month");
    const vehicleIdParam = Number(req.nextUrl.searchParams.get("vehicleId") ?? "");
    const { year, month } = parseMonth(monthParam);

    const start = new Date(year, month - 1, 1, 0, 0, 0, 0);
    const end = new Date(year, month, 1, 0, 0, 0, 0);

    const usages = await prisma.vehicleUsage.findMany({
      where: {
        startAt: { gte: start, lt: end },
        status: { in: ["APPROVED", "ACTIVE", "COMPLETED"] },
      },
      select: {
        id: true,
        status: true,
        startAt: true,
        endAt: true,
        tujuan: true,
        keperluan: true,
        vehicleId: true,
        vehicle: {
          select: {
            id: true,
            merk: true,
            nomorPolisi: true,
          },
        },
        user: {
          select: {
            id: true,
            name: true,
            nip: true,
          },
        },
      },
      orderBy: { startAt: "desc" },
      take: 2000,
    });

    const grouped = new Map<
      number,
      { vehicleId: number; merk: string; nomorPolisi: string; count: number }
    >();

    for (const u of usages) {
      const row = grouped.get(u.vehicleId) ?? {
        vehicleId: u.vehicle.id,
        merk: u.vehicle.merk,
        nomorPolisi: u.vehicle.nomorPolisi,
        count: 0,
      };
      row.count += 1;
      grouped.set(u.vehicleId, row);
    }

    const vehiclesThisMonth = Array.from(grouped.values()).sort((a, b) => b.count - a.count);
    const topVehicleThisMonth = vehiclesThisMonth[0] ?? null;

    let vehicleDetails: Array<{
      id: number;
      status: string;
      startAt: Date;
      endAt: Date | null;
      tujuan: string | null;
      keperluan: string | null;
      user: { id: number; name: string; nip: string };
    }> = [];

    if (Number.isInteger(vehicleIdParam) && vehicleIdParam > 0) {
      vehicleDetails = usages
        .filter((u) => u.vehicleId === vehicleIdParam)
        .map((u) => ({
          id: u.id,
          status: u.status,
          startAt: u.startAt,
          endAt: u.endAt,
          tujuan: u.tujuan,
          keperluan: u.keperluan,
          user: u.user,
        }));
    }

    return NextResponse.json({
      ok: true,
      month: `${year}-${String(month).padStart(2, "0")}`,
      topVehicleThisMonth,
      vehiclesThisMonth,
      selectedVehicleId:
        Number.isInteger(vehicleIdParam) && vehicleIdParam > 0 ? vehicleIdParam : null,
      vehicleDetails,
    });
  } catch (e) {
    return authErrorToResponse(e);
  }
}

