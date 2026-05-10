import { NextResponse } from "next/server";
import { runIngestionForAllDestinations } from "@/lib/research/ingest/run";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

function authorize(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return process.env.NODE_ENV !== "production";
  const header = request.headers.get("authorization");
  if (header === `Bearer ${secret}`) return true;
  return request.headers.get("x-vercel-cron-signature") === secret;
}

export async function GET(request: Request) {
  if (!authorize(request)) return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  const summaries = await runIngestionForAllDestinations();
  return NextResponse.json({ ok: true, summaries });
}

export async function POST(request: Request) {
  return GET(request);
}
