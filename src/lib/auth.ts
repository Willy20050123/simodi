import { SignJWT, jwtVerify } from "jose";
import { getCurrentUser } from "./currUser";

const secret = new TextEncoder().encode(process.env.JWT_SECRET!);

export type Role = "USER" | "ADMIN";

export type AuthPayload = {
    sub:    string;
    nip:    string;
    name:   string;
    fungsi: string;
    posisi: string;
    role:   Role;
}

export async function signAuthToken(payload: AuthPayload) {
    return new SignJWT(payload)
        .setProtectedHeader({alg: "HS256"})
        .setIssuedAt()
        .setExpirationTime("7d")
        .sign(secret);
}

export async function verifyAuthToken(token: string) {
    const { payload } = await jwtVerify(token, secret); 
    return payload as any;
}

