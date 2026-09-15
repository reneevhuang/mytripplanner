import type { CityAllocation } from "@/lib/planner/types";

export function CityAllocationRow({
  allocation,
  cities,
  tripStart,
  tripEnd,
  canRemove,
  onChange,
  onRemove,
}: {
  allocation: CityAllocation;
  cities: string[];
  tripStart: string;
  tripEnd: string;
  canRemove: boolean;
  onChange: (allocation: CityAllocation) => void;
  onRemove: () => void;
}) {
  return (
    <div className="allocation-row">
      <label className="field">
        City
        <select value={allocation.city} onChange={(event) => onChange({ ...allocation, city: event.target.value })}>
          {cities.map((city) => <option key={city}>{city}</option>)}
        </select>
      </label>
      <label className="field">
        From
        <input
          type="date"
          min={tripStart}
          max={tripEnd}
          value={allocation.startDate}
          onChange={(event) => onChange({ ...allocation, startDate: event.target.value })}
        />
      </label>
      <label className="field">
        To
        <input
          type="date"
          min={tripStart}
          max={tripEnd}
          value={allocation.endDate}
          onChange={(event) => onChange({ ...allocation, endDate: event.target.value })}
        />
      </label>
      {canRemove && <button className="text-button danger" type="button" onClick={onRemove}>Remove</button>}
    </div>
  );
}
