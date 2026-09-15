import { describe, expect, it } from "vitest";
import { itineraryToIcs } from "@/lib/exports/ics";
import { generateItinerary } from "@/lib/planner/generate";
import { getPlaces } from "@/lib/catalog/repository";

describe("calendar export", () => {
  it("creates one timezone-aware event per stop", () => {
    const itinerary = generateItinerary({
      name: "Day in Rome",
      startDate: "2026-10-01",
      endDate: "2026-10-01",
      cityAllocations: [{ city: "Rome", dates: ["2026-10-01"] }],
      dayStart: "09:00",
      dayEnd: "18:00",
      interests: ["historic"],
      budget: "any",
      pace: "relaxed",
      party: "solo",
    }, getPlaces(), new Date("2026-09-14T12:00:00Z"));
    const ics = itineraryToIcs(itinerary);
    expect(ics).toContain("BEGIN:VCALENDAR");
    expect(ics).toContain("DTSTART;TZID=Europe/Rome:");
    expect(ics.match(/BEGIN:VEVENT/g)).toHaveLength(itinerary.days[0].stops.length);
  });
});
