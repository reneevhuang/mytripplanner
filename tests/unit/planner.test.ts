import { describe, expect, it } from "vitest";
import { getPlaces } from "@/lib/catalog/repository";
import { sortCityAllocations } from "@/lib/planner/city-allocations";
import { generateItinerary } from "@/lib/planner/generate";
import { itinerarySchema } from "@/lib/planner/itinerary-schema";
import type { TripInput } from "@/lib/planner/types";

const input: TripInput = {
  name: "Roman weekend",
  startDate: "2026-10-01",
  endDate: "2026-10-02",
  cityAllocations: [{ city: "Rome", dates: ["2026-10-01", "2026-10-02"] }],
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
    expect(first.days.flatMap((day) => day.stops).flatMap((stop) => stop.warnings))
      .not.toContain("Opening hours are unverified.");
  });

  it("rejects impossible date ranges", () => {
    expect(() => generateItinerary({ ...input, startDate: "2026-10-03", endDate: "2026-10-01" }, getPlaces())).toThrow();
  });

  it("supports non-consecutive dates for the same city", () => {
    const itinerary = generateItinerary({
      ...input,
      endDate: "2026-10-03",
      cityAllocations: [
        { city: "Rome", dates: ["2026-10-01", "2026-10-03"] },
        { city: "Florence", dates: ["2026-10-02"] },
      ],
    }, getPlaces());

    expect(itinerary.days.map((day) => day.city)).toEqual(["Rome", "Florence", "Rome"]);
  });

  it("groups multiple cities on one date in allocation order", () => {
    const itinerary = generateItinerary({
      ...input,
      endDate: "2026-10-01",
      dayStart: "07:00",
      dayEnd: "23:30",
      pace: "full",
      cityAllocations: [
        { city: "Venice", dates: ["2026-10-01"] },
        { city: "Burano", dates: ["2026-10-01"] },
      ],
    }, getPlaces());
    const cities = itinerary.days[0].stops.map((stop) => stop.place.city);
    const firstBurano = cities.indexOf("Burano");

    expect(itinerary.days[0].city).toBe("Venice → Burano");
    expect(firstBurano).toBeGreaterThan(0);
    expect(cities.slice(firstBurano)).not.toContain("Venice");
  });

  it("sorts city rows by their earliest selected date", () => {
    expect(sortCityAllocations([
      { city: "Florence", dates: ["2026-10-03", "2026-10-02"] },
      { city: "Rome", dates: ["2026-10-01"] },
    ])).toEqual([
      { city: "Rome", dates: ["2026-10-01"] },
      { city: "Florence", dates: ["2026-10-02", "2026-10-03"] },
    ]);
  });

  it("converts legacy city date ranges when loading saved trips", () => {
    const itinerary = generateItinerary(input, getPlaces());
    const parsed = itinerarySchema.parse({
      ...itinerary,
      input: {
        ...itinerary.input,
        cityAllocations: [{ city: "Rome", startDate: "2026-10-01", endDate: "2026-10-02" }],
      },
    });

    expect(parsed.input.cityAllocations).toEqual([
      { city: "Rome", dates: ["2026-10-01", "2026-10-02"] },
    ]);
  });
});
