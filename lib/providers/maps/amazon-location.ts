import {
  CalculateRoutesCommand,
  GeoRoutesClient,
  type CalculateRoutesCommandOutput,
} from "@aws-sdk/client-geo-routes";
import type { TravelGap, TravelMode } from "@/lib/planner/types";
import { MapProviderError, type MapProvider, type RouteLocation } from "./types";

interface RoutesClient {
  send(command: CalculateRoutesCommand): Promise<CalculateRoutesCommandOutput>;
}

interface AmazonLocationProviderOptions {
  region?: string;
  apiKey?: string;
  client?: RoutesClient;
}

interface RouteSummary {
  Distance: number;
  Duration: number;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isRouteSummary(summary: unknown): summary is RouteSummary {
  if (!isRecord(summary)) return false;
  const candidate = summary;
  return typeof candidate.Distance === "number" && typeof candidate.Duration === "number";
}

function extractLegSummary(leg: unknown): RouteSummary | undefined {
  if (!isRecord(leg)) return undefined;
  const directSummary = leg.Summary;
  if (isRecord(directSummary) && isRouteSummary(directSummary.Overview)) return directSummary.Overview;

  for (const detailsKey of ["VehicleLegDetails", "PedestrianLegDetails", "FerryLegDetails"]) {
    const details = leg[detailsKey];
    if (!isRecord(details)) continue;
    const detailsSummary = details.Summary;
    if (isRecord(detailsSummary) && isRouteSummary(detailsSummary.Overview)) return detailsSummary.Overview;
  }

  return undefined;
}

function extractSummary(result: CalculateRoutesCommandOutput): RouteSummary | undefined {
  const route = result.Routes?.[0];
  if (!route) return undefined;
  if (isRouteSummary(route.Summary)) return route.Summary;

  const legSummaries = route.Legs
    ?.map(extractLegSummary)
    .filter(isRouteSummary);
  if (!legSummaries?.length) return undefined;

  return {
    Distance: legSummaries.reduce((total, summary) => total + summary.Distance, 0),
    Duration: legSummaries.reduce((total, summary) => total + summary.Duration, 0),
  };
}

export class AmazonLocationProvider implements MapProvider {
  private readonly region: string;
  private readonly apiKey?: string;
  private readonly client: RoutesClient;
  private readonly routeCache = new Map<string, TravelGap>();

  constructor(options: AmazonLocationProviderOptions = {}) {
    this.region = options.region
      ?? process.env.AMAZON_LOCATION_REGION
      ?? process.env.AWS_REGION
      ?? process.env.AWS_DEFAULT_REGION
      ?? "us-west-2";
    this.apiKey = options.apiKey ?? process.env.AWS_LOCATION_API_KEY;
    this.client = options.client ?? new GeoRoutesClient({ region: this.region });
  }

  async route(from: RouteLocation, to: RouteLocation, mode: TravelMode): Promise<TravelGap> {
    const travelMode = mode === "walking" ? "Pedestrian" : mode === "transit" ? "Transit" : "Car";
    const cacheKey = [
      this.region,
      from.latitude,
      from.longitude,
      to.latitude,
      to.longitude,
      travelMode,
    ].join(":");
    const cached = this.routeCache.get(cacheKey);
    if (cached) return cached;

    try {
      const result = await this.client.send(new CalculateRoutesCommand({
        Origin: [from.longitude, from.latitude],
        Destination: [to.longitude, to.latitude],
        TravelMode: travelMode,
        LegAdditionalFeatures: ["Summary"],
        Key: this.apiKey,
      }));
      const summary = extractSummary(result);
      if (!summary) {
        throw new MapProviderError("Amazon Location returned no usable route.", "provider-failure");
      }

      const gap: TravelGap = {
        distanceKm: Number((summary.Distance / 1000).toFixed(1)),
        minutes: Math.max(1, Math.ceil(summary.Duration / 60)),
        mode,
        source: "amazon-location",
      };
      this.routeCache.set(cacheKey, gap);
      return gap;
    } catch (error) {
      if (error instanceof MapProviderError) throw error;
      const message = error instanceof Error ? error.message : "Unknown routing error.";
      const notConfigured = /credential|access key|security token|unauthorized/i.test(message);
      throw new MapProviderError(
        notConfigured ? "AWS routing credentials are not configured." : "Amazon Location routing failed.",
        notConfigured ? "not-configured" : "provider-failure",
      );
    }
  }
}
