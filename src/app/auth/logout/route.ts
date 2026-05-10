import { NextResponse } from "next/server";
import { createSupabaseServerAuthClient } from "@/lib/supabase/server-auth";

export async function POST(request: Request) {
  const url = new URL(request.url);
  const supabase = await createSupabaseServerAuthClient();
  if (supabase) await supabase.auth.signOut();
  return NextResponse.redirect(new URL("/", url.origin));
}

export async function GET(request: Request) {
  return POST(request);
}
