import { format, parseISO } from "date-fns";
import type { CityAllocation } from "@/lib/planner/types";

export function CityAllocationRow({
  allocation,
  cities,
  tripDates,
  canRemove,
  onChange,
  onRemove,
}: {
  allocation: CityAllocation;
  cities: string[];
  tripDates: string[];
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
      <fieldset className="allocation-dates">
        <legend>Dates</legend>
        <div>
          {tripDates.map((date) => {
            const checked = allocation.dates.includes(date);
            return (
              <label className={checked ? "selected" : ""} key={date}>
                <input
                  checked={checked}
                  type="checkbox"
                  onChange={() => onChange({
                    ...allocation,
                    dates: checked
                      ? allocation.dates.filter((selectedDate) => selectedDate !== date)
                      : [...allocation.dates, date].sort(),
                  })}
                />
                {format(parseISO(date), "EEE, MMM d")}
              </label>
            );
          })}
        </div>
      </fieldset>
      {canRemove && <button className="text-button danger" type="button" onClick={onRemove}>Remove</button>}
    </div>
  );
}
