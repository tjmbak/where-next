import { NextResponse } from "next/server";
import { notifyLastCall } from "@/lib/push/triggers/last-call";

export const dynamic = "force-dynamic";
export const maxDuration = 120;

function authorize(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return process.env.NODE_ENV !== "production";
  const header = request.headers.get("authorization");
  if (header === `Bearer ${secret}`) return true;
  return request.headers.get("x-vercel-cron-signature") === secret;
}

export async function GET(request: Request) {
  if (!authorize(request)) return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  const result = await notifyLastCall();
  return NextResponse.json(result);
}

export async function POST(request: Request) {
  return GET(request);
}
