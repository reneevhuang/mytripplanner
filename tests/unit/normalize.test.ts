import { describe, expect, it } from "vitest";
import { normalizePlace, normalizeTag } from "@/lib/catalog/normalize";

describe("catalog normalization", () => {
  it("normalizes known and generic tag separators", () => {
    expect(normalizeTag("local_favorite")).toBe("local-favorite");
    expect(normalizeTag("Rainy Day")).toBe("rainy-day");
  });

  it("keeps unresolved optional values explicit", () => {
    const place = normalizePlace({
      id: "test",
      name: "Test",
      type: "museum",
      city: "Rome",
      region: "Lazio",
      neighborhood: null,
      description: "Test description",
      latitude: 41.9,
      longitude: 12.5,
      hours: null,
      duration_minutes: null,
      price_range: "€",
      rating: 4,
      tags: ["local_favorite"],
      seasonal_notes: null,
      booking_required: null,
    });
    expect(place.booking_required).toBeNull();
    expect(place.hoursStatus).toBe("unavailable");
    expect(place.importWarnings).toHaveLength(3);
  });
});
