import { NextResponse } from "next/server";
import { generateItinerary, generateItinerarySchema } from "@/lib/itineraries/generate";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const parsed = generateItinerarySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "invalid", issues: parsed.error.issues },
      { status: 400 }
    );
  }

  try {
    const itinerary = await generateItinerary(parsed.data);
    return NextResponse.json({ ok: true, itinerary });
  } catch (error) {
    console.error("[itinerary:generate]", error);
    const message = error instanceof Error ? error.message : "generation-failed";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
