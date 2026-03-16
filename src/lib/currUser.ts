import { cookies } from "next/headers";
import { verifyAuthToken } from "./auth";

export async function getCurrentUser() {
    const cookie = await cookies();
    const token = cookie.get("auth")?.value;
    
    if (!token) return null;
    try {
        return await verifyAuthToken(token);
    }
    catch {
        return null;
    }
}