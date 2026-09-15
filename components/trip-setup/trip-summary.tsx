import type { CityAllocation, Pace } from "@/lib/planner/types";

export function TripSummary({
  name,
  startDate,
  endDate,
  allocations,
  dayStart,
  dayEnd,
  pace,
  interestCount,
}: {
  name: string;
  startDate: string;
  endDate: string;
  allocations: CityAllocation[];
  dayStart: string;
  dayEnd: string;
  pace: Pace;
  interestCount: number;
}) {
  const content = (
    <dl>
      <div><dt>Trip</dt><dd>{name || "Untitled trip"}</dd></div>
      <div><dt>Dates</dt><dd>{startDate} → {endDate}</dd></div>
      <div><dt>Cities</dt><dd>{[...new Set(allocations.map((item) => item.city))].join(", ")}</dd></div>
      <div><dt>Daily window</dt><dd>{dayStart}–{dayEnd}</dd></div>
      <div><dt>Pace</dt><dd>{pace}</dd></div>
      <div><dt>Interests</dt><dd>{interestCount || "None selected"}</dd></div>
    </dl>
  );
  return (
    <>
      <aside className="trip-summary desktop-summary">
        <p className="eyebrow">YOUR TRIP</p>
        <h2>At a glance</h2>
        {content}
      </aside>
      <details className="trip-summary mobile-summary">
        <summary>Trip summary</summary>
        {content}
      </details>
    </>
  );
}
