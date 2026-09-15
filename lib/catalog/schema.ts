import { z } from "zod";

export const priceRangeSchema = z.enum(["€", "€€", "€€€", "€€€€"]);

export const rawPlaceSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  type: z.string().min(1),
  city: z.string().min(1),
  region: z.string().min(1),
  neighborhood: z.string().min(1).nullable(),
  description: z.string().min(1),
  latitude: z.number().finite().min(-90).max(90),
  longitude: z.number().finite().min(-180).max(180),
  hours: z.string().min(1).nullable(),
  duration_minutes: z.number().int().positive().nullable(),
  price_range: priceRangeSchema,
  rating: z.number().min(0).max(5),
  tags: z.array(z.string().min(1)),
  seasonal_notes: z.string().min(1).nullable(),
  booking_required: z.boolean().nullable(),
});

export const rawCatalogSchema = z.array(rawPlaceSchema);

export type RawPlace = z.infer<typeof rawPlaceSchema>;
export type PriceRange = z.infer<typeof priceRangeSchema>;

export type HoursStatus = "parsed" | "unknown" | "unavailable";

export interface ParsedHours {
  openMinutes: number;
  closeMinutes: number;
}

export interface Place extends Omit<RawPlace, "tags"> {
  tags: string[];
  tagLabels: string[];
  hoursStatus: HoursStatus;
  parsedHours: ParsedHours | null;
  importWarnings: string[];
}
