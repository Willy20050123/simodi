import { prisma } from "@/src/lib/prisma";
import { cookies } from "next/headers";
import { verifyAuthToken } from "@/src/lib/auth";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const token = (await cookies()).get("auth")?.value;
  if (!token)
    return Response.json({ ok: false, error: "UNAUTHORIZED" }, { status: 401 });

  const me = await verifyAuthToken(token);
  const userId = Number(me.sub);
  if (!userId)
    return Response.json({ ok: false, error: "UNAUTHORIZED" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const id = Number(body.id);
  if (!id)
    return Response.json({ ok: false, error: "id required" }, { status: 400 });

  const notif = await prisma.notification.findUnique({
    where: { id },
    select: { id: true, userId: true, readAt: true },
  });

  if (!notif || notif.userId !== userId) {
    return Response.json({ ok: false, error: "NOT_FOUND" }, { status: 404 });
  }

  if (!notif.readAt) {
    await prisma.notification.update({
      where: { id },
      data: { readAt: new Date() },
    });
  }

  return Response.json({ ok: true });
}
