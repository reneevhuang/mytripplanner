import { createHash } from "node:crypto";
import { itinerarySchema } from "@/lib/planner/itinerary-schema";
import type { Itinerary } from "@/lib/planner/types";
import { createSupabaseServiceClient } from "@/lib/supabase/server";

function hashToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

interface ShareRow {
  itineraries: { id: string; itinerary_payload: unknown } | null;
}

export async function getSharedItinerary(token: string): Promise<Itinerary | null> {
  const supabase = createSupabaseServiceClient();
  if (!supabase) return null;
  const { data, error } = await supabase
    .from("itinerary_shares")
    .select("itineraries(id,itinerary_payload)")
    .eq("token_hash", hashToken(token))
    .eq("active", true)
    .maybeSingle();
  if (error) throw error;

  const row = data as ShareRow | null;
  if (!row?.itineraries) return null;
  return itinerarySchema.parse({ ...(row.itineraries.itinerary_payload as object), id: row.itineraries.id });
}

