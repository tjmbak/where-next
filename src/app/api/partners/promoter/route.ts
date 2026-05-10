import { NextResponse } from "next/server";
import { z } from "zod";
import { createSupabaseServerAuthClient } from "@/lib/supabase/server-auth";

const schema = z.object({
  name: z.string().trim().min(2).max(120),
  city: z.string().trim().max(80).optional(),
  country: z.string().trim().max(80).optional(),
  contactEmail: z.string().email()
});

export async function POST(request: Request) {
  const supabase = await createSupabaseServerAuthClient();
  if (!supabase) return NextResponse.json({ error: "auth-not-configured" }, { status: 503 });

  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const body = await request.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "invalid", issues: parsed.error.issues }, { status: 400 });

  const { error } = await supabase.from("promoters").upsert(
    {
      owner_id: userData.user.id,
      name: parsed.data.name,
      city: parsed.data.city ?? null,
      country: parsed.data.country ?? null,
      contact_email: parsed.data.contactEmail,
      approved: false
    },
    { onConflict: "owner_id" }
  );

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
