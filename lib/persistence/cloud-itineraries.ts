import type { SupabaseClient } from "@supabase/supabase-js";
import { itinerarySchema } from "@/lib/planner/itinerary-schema";
import type { Itinerary } from "@/lib/planner/types";

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

interface ItineraryRow {
  id: string;
  itinerary_payload: unknown;
}

function withServerTimestamps(itinerary: Itinerary): Itinerary {
  return { ...itinerary, updatedAt: new Date().toISOString() };
}

export async function listCloudItineraries(supabase: SupabaseClient): Promise<Itinerary[]> {
  const { data, error } = await supabase
    .from("itineraries")
    .select("id,itinerary_payload")
    .order("updated_at", { ascending: false });
  if (error) throw error;
  return ((data ?? []) as ItineraryRow[]).map((row) =>
    itinerarySchema.parse({ ...row.itinerary_payload as object, id: row.id }),
  );
}

export async function saveCloudItinerary(
  supabase: SupabaseClient,
  ownerId: string,
  itinerary: Itinerary,
): Promise<Itinerary> {
  const parsed = itinerarySchema.parse(itinerary);
  const timestamped = withServerTimestamps(parsed);
  const isCloudId = UUID_PATTERN.test(timestamped.id);
  const baseRow = {
    owner_id: ownerId,
    name: timestamped.input.name,
    start_date: timestamped.input.startDate,
    end_date: timestamped.input.endDate,
    day_start: timestamped.input.dayStart,
    day_end: timestamped.input.dayEnd,
    pace: timestamped.input.pace,
    budget: timestamped.input.budget === "any" ? null : timestamped.input.budget,
    party: timestamped.input.party,
    itinerary_payload: timestamped,
  };

  const rowResult = isCloudId
    ? await supabase
      .from("itineraries")
      .update(baseRow)
      .eq("id", timestamped.id)
      .eq("owner_id", ownerId)
      .select("id")
      .maybeSingle()
    : await supabase
      .from("itineraries")
      .upsert({ ...baseRow, client_id: timestamped.id }, { onConflict: "owner_id,client_id" })
      .select("id")
      .single();

  if (rowResult.error) throw rowResult.error;
  if (!rowResult.data) {
    const inserted = await supabase
      .from("itineraries")
      .insert({ ...baseRow, client_id: null })
      .select("id")
      .single();
    if (inserted.error) throw inserted.error;
    rowResult.data = inserted.data;
  }

  const saved = { ...timestamped, id: rowResult.data.id };
  const { error } = await supabase
    .from("itineraries")
    .update({ itinerary_payload: saved })
    .eq("id", saved.id)
    .eq("owner_id", ownerId);
  if (error) throw error;
  return saved;
}

