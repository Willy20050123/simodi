import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { prisma } from "@/src/lib/prisma";
import { verifyAuthToken } from "@/src/lib/auth";

export const runtime = "nodejs";

export async function GET() {
  const token = (await cookies()).get("auth")?.value;
  if (!token)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const payload = await verifyAuthToken(token);

  const me = await prisma.user.findFirst({
    where: { id: Number(payload.sub), deletedAt: null },
    select: { role: true },
  });

  if (!me || me.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const users = await prisma.user.findMany({
    where: { deletedAt: null },
    orderBy: { id: "desc" },
    select: {
      id: true,
      nip: true,
      name: true,
      fungsi: true,
      posisi: true,
      createdAt: true,
    },
  });

  return NextResponse.json({ users });
}
