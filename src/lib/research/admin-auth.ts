import { NextResponse } from "next/server";

/**
 * Admin auth for /api/admin/research/* routes.
 *
 * Rules:
 *  - In production: ADMIN_TOKEN env var MUST be set, and requests must include
 *    a matching `x-admin-token` header.
 *  - In development: if ADMIN_TOKEN is unset, allow (dev convenience). If it
 *    is set, still enforce.
 */
export function requireAdmin(req: Request): NextResponse | null {
  const token = process.env.ADMIN_TOKEN;
  const isProd = process.env.NODE_ENV === "production";

  if (!token) {
    if (isProd) {
      return NextResponse.json(
        { error: "admin_unconfigured", message: "ADMIN_TOKEN not set" },
        { status: 503 }
      );
    }
    return null;
  }

  const provided = req.headers.get("x-admin-token");
  if (provided !== token) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }
  return null;
}
