import { prisma } from "@/src/lib/prisma";
import bcrypt from "bcryptjs";
import { cookies } from "next/headers";
import { verifyAuthToken } from "@/src/lib/auth";
import { Role } from "@prisma/client";

export async function POST(req: Request) {
  const token = (await cookies()).get("auth")?.value;
  if (!token) return Response.json({ error: "UNAUTHORIZED" }, { status: 401 });

  const me = await verifyAuthToken(token);
  if (me?.role !== "ADMIN")
    return Response.json({ error: "FORBIDDEN" }, { status: 403 });

  const body = await req.json().catch(() => ({}));

  const nip = String(body.nip ?? "").trim();
  const name = String(body.name ?? "").trim();
  const fungsi = String(body.fungsi ?? "").trim();
  const posisi = String(body.posisi ?? "").trim();
  const password = String(body.password ?? "");

  const roleRaw = String(body.role ?? "USER").toUpperCase();
  const role: Role = roleRaw === "ADMIN" ? "ADMIN" : "USER";

  if (!nip || !name || !fungsi || !posisi || !password) {
    return Response.json(
      { message: "Field wajib belum lengkap" },
      { status: 400 },
    );
  }

  try {
    const existing = await prisma.user.findFirst({
      where: { nip, deletedAt: null },
      select: { id: true },
    });
    if (existing) {
      return Response.json({ message: "NIP sudah terdaftar" }, { status: 409 });
    }

    const saltRounds = Number(process.env.ROUND) || 12;
    const passhash = await bcrypt.hash(password, saltRounds);

    const user = await prisma.user.create({
      data: { nip, name, fungsi, posisi, passhash, role, deletedAt: null },
      select: { id: true, role: true },
    });

    return Response.json({ ok: true, id: user.id, role: user.role });
  } catch (e: any) {
    return Response.json({ message: "Gagal membuat user" }, { status: 500 });
  }
}
