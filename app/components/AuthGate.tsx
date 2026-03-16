import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { verifyAuthToken } from "@/src/lib/auth";
import SidebarClient from "./SidebarClient";

export default async function AuthGate({ open }: { open: boolean }) {
    const cookie = await cookies();
    const token = cookie.get("auth")?.value;

    if (!token) redirect("/login");

    try {
        const user = await verifyAuthToken(token);
        return <SidebarClient open={open} user={user} />
    }
    catch {
        redirect("/login");
    }

}