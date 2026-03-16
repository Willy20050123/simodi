import { prisma } from "@/src/lib/prisma";
import { cookies } from "next/headers";
import { verifyAuthToken } from "@/src/lib/auth";

export async function POST(req: Request) {
  const token = (await cookies()).get("auth")?.value;
  if (!token) return Response.json({ error: "UNAUTHORIZED" }, { status: 401 });

  const me = await verifyAuthToken(token);
  if (me?.role !== "ADMIN")
    return Response.json({ error: "FORBIDDEN" }, { status: 403 });

  const body = await req.json().catch(() => ({}));

  const merk = String(body.merk ?? "").trim();
  const tahun = Number(body.tahun);
  const warna = String(body.warna ?? "").trim();
  const nomorPolisi = String(body.nomorPolisi ?? "").trim();
  const dalamPerbaikan = false;

  if (!merk || !tahun || !warna || !nomorPolisi) {
    return Response.json(
      { message: "Field wajib belum lengkap" },
      { status: 400 },
    );
  }

  try {
    const existing = await prisma.vehicle.findFirst({
      where: {
        nomorPolisi,
        deletedAt: null,
      },
      select: { id: true },
    });

    if (existing) {
      return Response.json(
        { message: "Nomor Polisi sudah terdaftar" },
        { status: 409 },
      );
    }

    const vehicle = await prisma.vehicle.create({
      data: {
        merk,
        tahun,
        warna,
        nomorPolisi,
        dalamPerbaikan,
        deletedAt: null,
      },
      select: { id: true },
    });

    return Response.json({
      ok: true,
      id: vehicle.id,
    });
  } catch (e: any) {
    return Response.json(
      { message: "Gagal menambahkan kendaraan" },
      { status: 500 },
    );
  }
}
