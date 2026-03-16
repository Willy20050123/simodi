import { NextRequest, NextResponse } from "next/server";
import { verifyAuthToken } from "./src/lib/auth";

const PUBLIC_PREFIX = ["/", "/forgot-password"];

const PUBLIC_API = ["/api/login", "/api/forgot-password"];

const ADMIN_PREFIX = ["/accounts"];

function startsWithAny(pathname: string, prefixes: string[]) {
  return prefixes.some((p) =>
    p === "/" ? pathname === "/" : pathname.startsWith(p),
  );
}

export async function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;

  if (startsWithAny(pathname, PUBLIC_PREFIX)) return NextResponse.next();

  if (startsWithAny(pathname, PUBLIC_API)) return NextResponse.next();

  const token = req.cookies.get("auth")?.value;
  if (!token) {
    const url = req.nextUrl.clone();
    url.pathname = "/";
    return NextResponse.redirect(url);
  }

  try {
    const payload = await verifyAuthToken(token);
    const role = String(payload?.role ?? "").toUpperCase();

    if (startsWithAny(pathname, ADMIN_PREFIX) && role !== "ADMIN") {
      const url = req.nextUrl.clone();
      url.pathname = "/dashboard";
      return NextResponse.redirect(url);
    }

    return NextResponse.next();
  } catch {
    const url = req.nextUrl.clone();
    url.pathname = "/";
    return NextResponse.redirect(url);
  }
}

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/vehicles/:path*",
    "/profile/:path*",
    "/account/:path*",
    "/accounts/:path*",
    "/api/:path*",
  ],
};
