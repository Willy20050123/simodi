import { prisma } from "@/src/lib/prisma";
import { NotificationType, Prisma } from "@prisma/client";

type Tx = Prisma.TransactionClient;

export async function notifyAllAdmins(
  params: {
    type: NotificationType;
    title: string;
    message?: string;
    href?: string;
  },
  opts?: { tx?: Tx },
) {
  const db = opts?.tx ?? prisma;

  const admins = await db.user.findMany({
    where: { role: "ADMIN", deletedAt: null },
    select: { id: true },
  });

  if (!admins.length) return;

  await db.notification.createMany({
    data: admins.map((a) => ({
      userId: a.id,
      type: params.type,
      title: params.title,
      message: params.message,
      href: params.href,
    })),
  });
}

export async function notifyUser(
  params: {
    userId: number;
    type: NotificationType;
    title: string;
    message?: string;
    href?: string;
  },
  opts?: { tx?: Tx },
) {
  const db = opts?.tx ?? prisma;

  await db.notification.create({
    data: {
      userId: params.userId,
      type: params.type,
      title: params.title,
      message: params.message,
      href: params.href,
    },
  });
}
