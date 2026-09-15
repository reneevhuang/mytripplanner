import type { ItineraryStop } from "@/lib/planner/types";

export function ItineraryStopCard({
  stop,
  stopIndex,
  stopCount,
  readOnly,
  onMove,
  onRemove,
  onToggleLock,
  onTimeChange,
  onNotesChange,
  onDragStart,
  onDrop,
}: {
  stop: ItineraryStop;
  stopIndex: number;
  stopCount: number;
  readOnly: boolean;
  onMove: (direction: -1 | 1) => void;
  onRemove: () => void;
  onToggleLock: () => void;
  onTimeChange: (time: string) => void;
  onNotesChange: (notes: string) => void;
  onDragStart: () => void;
  onDrop: () => void;
}) {
  return (
    <li
      className="stop-card"
      draggable={!readOnly}
      onDragStart={onDragStart}
      onDragOver={(event) => event.preventDefault()}
      onDrop={onDrop}
    >
      {stop.travelFromPrevious && (
        <p className="travel-gap">
          <span aria-hidden="true">↳</span> {stop.travelFromPrevious.minutes} min {stop.travelFromPrevious.mode} ·{" "}
          {stop.travelFromPrevious.source === "amazon-location"
            ? "Amazon Location route"
            : stop.travelFromPrevious.source === "azure-maps"
              ? "legacy Azure Maps route"
              : "straight-line estimate"}
        </p>
      )}
      <div className="stop-time">
        {readOnly ? (
          <strong>{stop.startTime}</strong>
        ) : (
          <input
            aria-label={`Start time for ${stop.place.name}`}
            step="1800"
            type="time"
            value={stop.startTime}
            onChange={(event) => onTimeChange(event.target.value)}
          />
        )}
        <span>{stop.durationMinutes} min{stop.durationEstimated ? " est." : ""}</span>
      </div>
      <div className="stop-body">
        <div>
          <h3>{stop.place.name}</h3>
          <p>{stop.place.neighborhood ?? stop.place.city} · {stop.place.type.replaceAll("_", " ")}</p>
        </div>
        {!readOnly && (
          <div className="stop-controls" aria-label={`Controls for ${stop.place.name}`}>
            <button type="button" onClick={() => onMove(-1)} disabled={stopIndex === 0} aria-label="Move earlier">↑</button>
            <button type="button" onClick={() => onMove(1)} disabled={stopIndex === stopCount - 1} aria-label="Move later">↓</button>
            <details className="stop-menu">
              <summary>More</summary>
              <div>
                <button type="button" className={stop.locked ? "active" : ""} onClick={onToggleLock}>
                  {stop.locked ? "Unlock stop" : "Lock stop"}
                </button>
                <button type="button" className="danger" onClick={onRemove}>Remove stop</button>
              </div>
            </details>
          </div>
        )}
      </div>
      {stop.warnings.length > 0 && <ul className="warning-list">{stop.warnings.map((warning) => <li key={warning}>{warning}</li>)}</ul>}
      {readOnly
        ? stop.notes && <p className="stop-notes">{stop.notes}</p>
        : <label className="field notes-field">Notes<textarea value={stop.notes} onChange={(event) => onNotesChange(event.target.value)} placeholder="Reservation, ticket, or personal note" /></label>}
    </li>
  );
}
