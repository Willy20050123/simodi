import { prisma } from "@/src/lib/prisma";
import { cookies } from "next/headers";
import { verifyAuthToken } from "@/src/lib/auth";

export const runtime = "nodejs";

export async function GET() {
  const token = (await cookies()).get("auth")?.value;
  if (!token)
    return Response.json({ ok: false, error: "UNAUTHORIZED" }, { status: 401 });

  const me = await verifyAuthToken(token);
  const userId = Number(me.sub);
  if (!userId)
    return Response.json({ ok: false, error: "UNAUTHORIZED" }, { status: 401 });

  const [items, unreadCount] = await Promise.all([
    prisma.notification.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take: 20,
      select: {
        id: true,
        type: true,
        title: true,
        message: true,
        href: true,
        createdAt: true,
        readAt: true,
      },
    }),
    prisma.notification.count({
      where: { userId, readAt: null },
    }),
  ]);

  return Response.json({ ok: true, data: items, unreadCount });
}
