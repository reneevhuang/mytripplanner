import { describe, expect, it, vi } from "vitest";
import type { CalculateRoutesCommandOutput } from "@aws-sdk/client-geo-routes";
import { AmazonLocationProvider } from "@/lib/providers/maps/amazon-location";
import { getPlaces } from "@/lib/catalog/repository";

describe("Amazon Location provider", () => {
  it("maps a route summary into a travel gap", async () => {
    const client = {
      send: vi.fn(async (): Promise<CalculateRoutesCommandOutput> => ({
        LegGeometryFormat: "Simple",
        Notices: [],
        PricingBucket: "Basic",
        Routes: [{
          Legs: [{
            PedestrianLegDetails: {
              Arrival: { Place: { Position: [12.4922, 41.8902] } },
              Departure: { Place: { Position: [12.4964, 41.9028] } },
              PassThroughWaypoints: [],
              Spans: [],
              Overview: { Distance: 1450, Duration: 960 },
              Summary: {
                Overview: { Distance: 1450, Duration: 960 },
                TravelOnly: { Duration: 960 },
              },
              TravelSteps: [],
            },
          } as unknown as NonNullable<NonNullable<CalculateRoutesCommandOutput["Routes"]>[number]["Legs"]>[number]],
          MajorRoadLabels: [],
        }],
        $metadata: {},
      })),
    };
    const [from, to] = getPlaces();
    const gap = await new AmazonLocationProvider({ region: "us-west-2", client }).route(from, to, "walking");
    expect(gap).toEqual({ distanceKm: 1.4, minutes: 16, mode: "walking", source: "amazon-location" });
  });

  it("reports missing AWS credentials explicitly", async () => {
    const client = {
      send: vi.fn(async () => {
        throw new Error("Could not load credentials from any providers");
      }),
    };
    const [from, to] = getPlaces();
    await expect(new AmazonLocationProvider({ region: "us-west-2", client }).route(from, to, "walking"))
      .rejects.toMatchObject({ code: "not-configured" });
  });
});
