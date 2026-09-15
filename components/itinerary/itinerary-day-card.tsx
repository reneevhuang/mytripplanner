import type { ItineraryDay } from "@/lib/planner/types";
import { ItineraryStopCard } from "./itinerary-stop-card";

export function ItineraryDayCard({
  day,
  readOnly,
  onMove,
  onRemove,
  onToggleLock,
  onTimeChange,
  onNotesChange,
  onDragStart,
  onDrop,
}: {
  day: ItineraryDay;
  readOnly: boolean;
  onMove: (stopIndex: number, direction: -1 | 1) => void;
  onRemove: (stopIndex: number) => void;
  onToggleLock: (stopIndex: number) => void;
  onTimeChange: (stopIndex: number, time: string) => void;
  onNotesChange: (stopIndex: number, notes: string) => void;
  onDragStart: (stopIndex: number) => void;
  onDrop: (stopIndex: number) => void;
}) {
  return (
    <article className="day-card">
      <header>
        <div><p className="eyebrow">{day.date}</p><h2>{day.city}</h2></div>
        <span>{day.stops.length} stops</span>
      </header>
      {day.warnings.map((warning) => <p className="warning day-warning" key={warning}>{warning}</p>)}
      <ol className="stop-list">
        {day.stops.map((stop, stopIndex) => (
          <ItineraryStopCard
            key={stop.id}
            onDragStart={() => onDragStart(stopIndex)}
            onDrop={() => onDrop(stopIndex)}
            onMove={(direction) => onMove(stopIndex, direction)}
            onNotesChange={(notes) => onNotesChange(stopIndex, notes)}
            onRemove={() => onRemove(stopIndex)}
            onTimeChange={(time) => onTimeChange(stopIndex, time)}
            onToggleLock={() => onToggleLock(stopIndex)}
            readOnly={readOnly}
            stop={stop}
            stopCount={day.stops.length}
            stopIndex={stopIndex}
          />
        ))}
      </ol>
      {!day.stops.length && <p className="empty-day">No stops scheduled for this day.</p>}
    </article>
  );
}
