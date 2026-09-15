import type { Place, PriceRange } from "@/lib/catalog/schema";
import type { TripInput } from "./types";

const PRICE_LEVEL: Record<PriceRange, number> = { "€": 1, "€€": 2, "€€€": 3, "€€€€": 4 };

export const PLANNER_WEIGHTS = {
  rating: 12,
  interestMatch: 9,
  budgetMatch: 5,
  bookingPenalty: 2,
  unknownPenalty: 1,
} as const;

export function scorePlace(place: Place, input: TripInput): number {
  const interestMatches = place.tags.filter((tag) => input.interests.includes(tag)).length;
  const budgetScore =
    input.budget === "any"
      ? 1
      : Math.max(0, 2 - Math.abs(PRICE_LEVEL[place.price_range] - PRICE_LEVEL[input.budget]));
  const bookingPenalty = place.booking_required === true ? PLANNER_WEIGHTS.bookingPenalty : 0;
  const unknownPenalty = place.duration_minutes === null || place.hoursStatus !== "parsed" ? PLANNER_WEIGHTS.unknownPenalty : 0;

  return (
    place.rating * PLANNER_WEIGHTS.rating +
    interestMatches * PLANNER_WEIGHTS.interestMatch +
    budgetScore * PLANNER_WEIGHTS.budgetMatch -
    bookingPenalty -
    unknownPenalty
  );
}
