import { z } from "zod";
import { rawPlaceSchema } from "@/lib/catalog/schema";

const placeSchema = rawPlaceSchema.extend({
  tags: z.array(z.string()),
  tagLabels: z.array(z.string()),
  hoursStatus: z.enum(["parsed", "unknown", "unavailable"]),
  parsedHours: z.object({
    openMinutes: z.number().int().nonnegative(),
    closeMinutes: z.number().int().nonnegative(),
  }).nullable(),
  importWarnings: z.array(z.string()),
});

const travelGapSchema = z.object({
  minutes: z.number().int().positive(),
  distanceKm: z.number().nonnegative(),
  mode: z.enum(["walking", "transit", "driving"]),
  source: z.enum(["heuristic", "amazon-location", "azure-maps"]),
});

const tripInputSchema = z.object({
  name: z.string().min(1),
  startDate: z.string().min(1),
  endDate: z.string().min(1),
  cityAllocations: z.array(z.object({
    city: z.string().min(1),
    startDate: z.string().min(1),
    endDate: z.string().min(1),
  })).min(1),
  dayStart: z.string().min(1),
  dayEnd: z.string().min(1),
  interests: z.array(z.string()),
  budget: z.union([z.enum(["€", "€€", "€€€", "€€€€"]), z.literal("any")]),
  pace: z.enum(["relaxed", "balanced", "full"]),
  party: z.enum(["solo", "couple", "family", "friends"]),
});

const itineraryStopSchema = z.object({
  id: z.string().min(1),
  placeId: z.string().min(1),
  place: placeSchema,
  startTime: z.string().min(1),
  durationMinutes: z.number().int().positive(),
  durationEstimated: z.boolean(),
  locked: z.boolean(),
  notes: z.string(),
  warnings: z.array(z.string()),
  travelFromPrevious: travelGapSchema.nullable(),
});

const itineraryDaySchema = z.object({
  date: z.string().min(1),
  city: z.string().min(1),
  notes: z.string(),
  stops: z.array(itineraryStopSchema),
  warnings: z.array(z.string()),
});

export const itinerarySchema = z.object({
  id: z.string().min(1),
  version: z.literal(1),
  input: tripInputSchema,
  days: z.array(itineraryDaySchema),
  createdAt: z.string().min(1),
  updatedAt: z.string().min(1),
  warnings: z.array(z.string()),
});

