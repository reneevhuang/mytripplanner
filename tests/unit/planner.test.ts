import { describe, expect, it } from "vitest";
import { getPlaces } from "@/lib/catalog/repository";
import { generateItinerary } from "@/lib/planner/generate";
import type { TripInput } from "@/lib/planner/types";

const input: TripInput = {
  name: "Roman weekend",
  startDate: "2026-10-01",
  endDate: "2026-10-02",
  cityAllocations: [{ city: "Rome", startDate: "2026-10-01", endDate: "2026-10-02" }],
  dayStart: "09:00",
  dayEnd: "19:00",
  interests: ["historic", "food"],
  budget: "€€",
  pace: "balanced",
  party: "couple",
};

describe("itinerary generation", () => {
  it("is deterministic and respects core invariants", () => {
    const now = new Date("2026-09-14T12:00:00Z");
    const first = generateItinerary(input, getPlaces(), now);
    const second = generateItinerary(input, getPlaces(), now);
    expect(first).toEqual(second);
    expect(first.days).toHaveLength(2);
    expect(first.days.every((day) => day.city === "Rome")).toBe(true);
    const ids = first.days.flatMap((day) => day.stops.map((stop) => stop.placeId));
    expect(new Set(ids).size).toBe(ids.length);
    expect(first.days.flatMap((day) => day.stops).every((stop) => stop.startTime >= input.dayStart)).toBe(true);
    expect(first.days.flatMap((day) => day.stops).every((stop) => stop.startTime.endsWith(":00") || stop.startTime.endsWith(":30"))).toBe(true);
  });

  it("rejects impossible date ranges", () => {
    expect(() => generateItinerary({ ...input, startDate: "2026-10-03", endDate: "2026-10-01" }, getPlaces())).toThrow();
  });
});
