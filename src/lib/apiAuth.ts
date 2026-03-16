import { NextRequest } from "next/server";
import { verifyAuthToken } from "./auth";
import { prisma } from "./prisma";

export type SessionUser = {
  id: number;
  nip: string;
  name: string;
  fungsi: string;
  posisi: string;
  role: "USER" | "ADMIN";
};

export async function requireAuth(req: NextRequest): Promise<SessionUser> {
  const token = req.cookies.get("auth")?.value;
  if (!token) throw new Error("UNAUTHORIZED");

  const payload = await verifyAuthToken(token);
  const id = Number(payload.sub);
  if (!id || Number.isNaN(id)) throw new Error("UNAUTHORIZED");

  const user = await prisma.user.findFirst({
    where: { id, deletedAt: null },
    select: { id: true, nip: true, name: true, fungsi: true, posisi: true, role: true },
  });
  if (!user) throw new Error("UNAUTHORIZED");

  return {
    id: user.id,
    nip: user.nip,
    name: user.name,
    fungsi: user.fungsi,
    posisi: user.posisi,
    role: user.role,
  };
}

export async function requireAdmin(req: NextRequest): Promise<SessionUser> {
  const me = await requireAuth(req);
  if (me.role !== "ADMIN") throw new Error("FORBIDDEN");
  return me;
}
