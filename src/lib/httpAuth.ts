import { NextResponse } from "next/server";

export function authErrorToResponse(err: unknown) {
  const msg = err instanceof Error ? err.message : String(err);

  if (msg === "UNAUTHORIZED") {
    return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  }
  if (msg === "FORBIDDEN") {
    return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });
  }

  return NextResponse.json({ error: "INTERNAL_ERROR" }, { status: 500 });
}
