import { createHash, randomBytes } from "node:crypto";
import { NextResponse } from "next/server";
import { itinerarySchema } from "@/lib/planner/itinerary-schema";
import { saveCloudItinerary } from "@/lib/persistence/cloud-itineraries";
import { createSupabaseServerClient } from "@/lib/supabase/server";

function hashToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

export async function POST(request: Request) {
  const supabase = await createSupabaseServerClient();
  if (!supabase) return NextResponse.json({ error: "Supabase is not configured." }, { status: 503 });

  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError || !user) return NextResponse.json({ error: "Sign in to create server-backed share links." }, { status: 401 });

  const parsed = itinerarySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid itinerary.", details: parsed.error.flatten() }, { status: 400 });
  }

  const itinerary = await saveCloudItinerary(supabase, user.id, parsed.data);
  const token = randomBytes(24).toString("base64url");
  const { error } = await supabase.from("itinerary_shares").insert({
    itinerary_id: itinerary.id,
    token_hash: hashToken(token),
    access: "read_only",
    active: true,
  });
  if (error) throw error;

  return NextResponse.json({ url: `/share/${token}`, token, itinerary });
}

