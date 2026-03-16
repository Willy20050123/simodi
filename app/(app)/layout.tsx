export const dynamic = "force-dynamic";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { verifyAuthToken } from "@/src/lib/auth";
import { prisma } from "@/src/lib/prisma";
import ClientLayout from "./ClientLayout";

export default async function Layout({ children }: { children: React.ReactNode }) {
    const token = (await cookies()).get("auth")?.value;
    if (!token) redirect("/login");

    let payload;
    try {
        payload = await verifyAuthToken(token);
    }
    catch {
        redirect("/login");
    }

    const user = await prisma.user.findUnique({
        where: {id: Number(payload.sub)},
    })

    if (!user) redirect("/login");
    return <ClientLayout user={user}>{children}</ClientLayout>
}