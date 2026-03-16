import { verifyAuthToken } from "@/src/lib/auth";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import SidebarClient from "./SidebarClient";

export default async function Sidebar({ open }: { open: boolean }) {
    const cookie = await cookies();
    const token = cookie.get("auth")?.value;
    if (!token) redirect("/login");
    
    let user: any;

    try {
        user = await verifyAuthToken(token);
    }
    catch {
        redirect("/login");
    }

    return <SidebarClient open={open} user={user} />;
}