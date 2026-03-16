import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { verifyAuthToken } from "@/src/lib/auth";
import { prisma } from "@/src/lib/prisma";
import UsersPage from "@/app/components/UserPage";

export const dynamic = "force-dynamic";

export default async function AccountsPage() {
  const token = (await cookies()).get("auth")?.value;
  if (!token) redirect("/login");

  const payload = await verifyAuthToken(token);

  const me = await prisma.user.findUnique({
    where: { id: Number(payload.sub) },
    select: { id: true, role: true, name: true },
  });

  if (!me) redirect("/login");
  if (me.role !== "ADMIN") redirect("/dashboard");

  return (
    <UsersPage
      currentUser={{
        id: me.id,
        role: me.role,
        name: me.name,
      }}
    />
  );
}