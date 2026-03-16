import { prisma } from "@/src/lib/prisma";
import { cookies } from "next/headers";
import { verifyAuthToken } from "@/src/lib/auth";

export const runtime = "nodejs";

export async function POST() {
  const token = (await cookies()).get("auth")?.value;
  if (!token)
    return Response.json({ ok: false, error: "UNAUTHORIZED" }, { status: 401 });

  const me = await verifyAuthToken(token);
  const userId = Number(me.sub);
  if (!userId)
    return Response.json({ ok: false, error: "UNAUTHORIZED" }, { status: 401 });

  const r = await prisma.notification.updateMany({
    where: { userId, readAt: null },
    data: { readAt: new Date() },
  });

  return Response.json({ ok: true, updated: r.count });
}
