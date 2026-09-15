import { NextResponse } from "next/server";
import { itinerarySchema } from "@/lib/planner/itinerary-schema";
import { listCloudItineraries, saveCloudItinerary } from "@/lib/persistence/cloud-itineraries";
import { createSupabaseServerClient } from "@/lib/supabase/server";

async function getAuthenticatedClient() {
  const supabase = await createSupabaseServerClient();
  if (!supabase) return { error: NextResponse.json({ error: "Supabase is not configured." }, { status: 503 }) };
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) return { error: NextResponse.json({ error: "Sign in to sync itineraries." }, { status: 401 }) };
  return { supabase, user };
}

export async function GET() {
  const auth = await getAuthenticatedClient();
  if ("error" in auth) return auth.error;
  const itineraries = await listCloudItineraries(auth.supabase);
  return NextResponse.json({ itineraries });
}

export async function POST(request: Request) {
  const auth = await getAuthenticatedClient();
  if ("error" in auth) return auth.error;

  const parsed = itinerarySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid itinerary.", details: parsed.error.flatten() }, { status: 400 });
  }

  const itinerary = await saveCloudItinerary(auth.supabase, auth.user.id, parsed.data);
  return NextResponse.json({ itinerary });
}

