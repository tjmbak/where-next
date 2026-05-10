import { NextResponse } from "next/server";
import { waitlistSchema } from "@/lib/validation";
import { createSupabaseServiceClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  const payload = await request.json().catch(() => null);
  const parsed = waitlistSchema.safeParse(payload);

  if (!parsed.success) {
    return NextResponse.json({ error: "Please enter a valid email address." }, { status: 400 });
  }

  const supabase = createSupabaseServiceClient();

  if (supabase) {
    const { error } = await supabase.from("waitlist_signups").insert({
      email: parsed.data.email,
      home_city: parsed.data.homeCity ?? null,
      favorite_genres: parsed.data.favoriteGenres ?? []
    });

    if (error) {
      return NextResponse.json({ error: "Could not save your signup. Please try again." }, { status: 500 });
    }
  }

  return NextResponse.json({ ok: true });
}
