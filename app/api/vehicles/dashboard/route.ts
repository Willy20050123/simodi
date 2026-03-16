// import { prisma } from "@/src/lib/prisma";

// export async function GET() {
//   const vehicles = await prisma.vehicle.findMany({
//     orderBy: { id: "desc" },
//     select: {
//       id: true,
//       merk: true,
//       tahun: true,
//       warna: true,
//       nomorPolisi: true,
//       dalamPerbaikan: true,
//     },
//   });

//   return Response.json(vehicles);
// }
import { prisma } from "@/src/lib/prisma";

export async function GET() {
  const now = new Date();

  const deadlineHours = 8;
  const deadline = new Date(now.getTime() - deadlineHours * 60 * 60 * 1000);

  const [totalVehicles, diperbaiki, inUseVehicleIds, overdueVehicleIds] =
    await Promise.all([
    prisma.vehicle.count({
      where: { deletedAt: null },
    }),

    prisma.vehicle.count({
      where: { dalamPerbaikan: true, deletedAt: null },
    }),

    prisma.vehicleUsage.findMany({
      where: {
        vehicle: { deletedAt: null },
        status: { in: ["ACTIVE", "APPROVED"] },
        startAt: { lte: now },
        OR: [{ endAt: null }, { endAt: { gt: now } }],
      },
      select: { vehicleId: true },
      distinct: ["vehicleId"],
    }),

    prisma.vehicleUsage.findMany({
      where: {
        vehicle: { deletedAt: null },
        status: "ACTIVE",
        startAt: { lt: deadline },
        OR: [{ endAt: null }, { endAt: { gt: now } }],
      },
      select: { vehicleId: true },
      distinct: ["vehicleId"],
    }),
  ]);

  const digunakan = inUseVehicleIds.length;
  const overdue = overdueVehicleIds.length;
  const tersedia = Math.max(0, totalVehicles - diperbaiki - digunakan);

  return Response.json({
    tersedia,
    digunakan,
    diperbaiki,
    overdue,
    total: totalVehicles,
  });
}
