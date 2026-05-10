import { NextResponse } from "next/server";
import { z } from "zod";
import { createSupabaseServerAuthClient } from "@/lib/supabase/server-auth";

const schema = z.object({
  promoterId: z.string().uuid(),
  destinationSlug: z.string().trim().min(1).max(80),
  title: z.string().trim().min(2).max(160),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().optional(),
  ticketUrl: z.string().url().nullable().optional(),
  summary: z.string().trim().max(800).nullable().optional()
});

export async function POST(request: Request) {
  const supabase = await createSupabaseServerAuthClient();
  if (!supabase) return NextResponse.json({ error: "auth-not-configured" }, { status: 503 });

  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const body = await request.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "invalid", issues: parsed.error.issues }, { status: 400 });

  // RLS will reject if the promoter row isn't owned by the user.
  const { data, error } = await supabase
    .from("promoter_events")
    .insert({
      promoter_id: parsed.data.promoterId,
      destination_slug: parsed.data.destinationSlug,
      title: parsed.data.title,
      start_date: parsed.data.startDate,
      end_date: parsed.data.endDate ?? null,
      ticket_url: parsed.data.ticketUrl ?? null,
      summary: parsed.data.summary ?? null,
      status: "submitted"
    })
    .select("id, destination_slug, title, start_date, end_date, ticket_url, summary, status")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, event: data });
}
