import { NextResponse } from "next/server";
import { createSupabaseServiceClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const token = url.searchParams.get("token");
  const channel = url.searchParams.get("channel") ?? "drop";

  if (!token) return NextResponse.redirect(new URL("/", url.origin));

  const supabase = createSupabaseServiceClient();
  if (!supabase) {
    return NextResponse.redirect(new URL("/?unsubscribed=err", url.origin));
  }

  const update =
    channel === "push"
      ? { push_enabled: false }
      : channel === "fork"
        ? { fork_email_enabled: false }
        : { drop_enabled: false };

  await supabase.from("user_preferences").update(update).eq("user_id", token);

  return NextResponse.redirect(new URL("/?unsubscribed=1", url.origin));
}
