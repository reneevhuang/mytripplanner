"use client";

import { useEffect, useState } from "react";
import { timeFromMinutes, minutesFromTime, roundUpToHalfHour } from "@/lib/catalog/hours";
import { itineraryToIcs } from "@/lib/exports/ics";
import { findDayConflicts } from "@/lib/planner/conflicts";
import { estimateTravelGap } from "@/lib/planner/proximity";
import type { Itinerary, ItineraryDay, ItineraryStop } from "@/lib/planner/types";
import { saveGuestItinerary } from "@/lib/persistence/guest-store";
import { EditorActionBar } from "./editor-action-bar";
import { ItineraryDayCard } from "./itinerary-day-card";

function rescheduleDay(day: ItineraryDay, dayStart: string, dayEnd: string): ItineraryDay {
  let cursor = minutesFromTime(dayStart);
  const stops = day.stops.map((stop, index, all) => {
    const gap = index > 0 ? estimateTravelGap(all[index - 1].place, stop.place) : null;
    cursor = roundUpToHalfHour(cursor + (gap?.minutes ?? 0));
    const updated = { ...stop, startTime: timeFromMinutes(cursor), travelFromPrevious: gap };
    cursor += stop.durationMinutes;
    return updated;
  });
  const updated = { ...day, stops };
  return { ...updated, warnings: findDayConflicts(updated, dayEnd) };
}

function download(filename: string, content: string, type: string) {
  const url = URL.createObjectURL(new Blob([content], { type }));
  const anchor = document.createElement("a");
  anchor.href = url; anchor.download = filename; anchor.click();
  URL.revokeObjectURL(url);
}

export function ItineraryEditor({ itinerary, onChange, onClose, readOnly = false }: { itinerary: Itinerary; onChange?: (value: Itinerary) => void; onClose?: () => void; readOnly?: boolean }) {
  const [status, setStatus] = useState("");
  const [dragged, setDragged] = useState<{ dayIndex: number; stopIndex: number } | null>(null);

  useEffect(() => {
    if (readOnly) return;
    const timer = window.setTimeout(() => {
      try {
        saveGuestItinerary(itinerary);
        setStatus("All changes saved on this device.");
      } catch {
        setStatus("Autosave failed. Check browser storage permissions.");
      }
    }, 500);
    return () => window.clearTimeout(timer);
  }, [itinerary, readOnly]);

  const updateDays = (days: ItineraryDay[]) => onChange?.({ ...itinerary, days, updatedAt: new Date().toISOString() });
  const updateStop = (dayIndex: number, stopIndex: number, update: Partial<ItineraryStop>) => updateDays(itinerary.days.map((day, index) => index === dayIndex ? { ...day, stops: day.stops.map((stop, itemIndex) => itemIndex === stopIndex ? { ...stop, ...update } : stop) } : day));
  const move = (dayIndex: number, stopIndex: number, direction: -1 | 1) => {
    const target = stopIndex + direction;
    if (target < 0 || target >= itinerary.days[dayIndex].stops.length) return;
    const days = itinerary.days.map((day) => ({ ...day, stops: [...day.stops] }));
    const [stop] = days[dayIndex].stops.splice(stopIndex, 1);
    days[dayIndex].stops.splice(target, 0, stop);
    days[dayIndex] = rescheduleDay(days[dayIndex], itinerary.input.dayStart, itinerary.input.dayEnd);
    updateDays(days);
  };
  const remove = (dayIndex: number, stopIndex: number) => {
    const days = itinerary.days.map((day) => ({ ...day, stops: [...day.stops] }));
    days[dayIndex].stops.splice(stopIndex, 1);
    days[dayIndex] = rescheduleDay(days[dayIndex], itinerary.input.dayStart, itinerary.input.dayEnd);
    updateDays(days);
  };
  const drop = (targetDayIndex: number, targetStopIndex: number) => {
    if (!dragged) return;
    const days = itinerary.days.map((day) => ({ ...day, stops: [...day.stops] }));
    const [stop] = days[dragged.dayIndex].stops.splice(dragged.stopIndex, 1);
    const adjustedTarget = dragged.dayIndex === targetDayIndex && dragged.stopIndex < targetStopIndex ? targetStopIndex - 1 : targetStopIndex;
    days[targetDayIndex].stops.splice(adjustedTarget, 0, stop);
    days[dragged.dayIndex] = rescheduleDay(days[dragged.dayIndex], itinerary.input.dayStart, itinerary.input.dayEnd);
    days[targetDayIndex] = rescheduleDay(days[targetDayIndex], itinerary.input.dayStart, itinerary.input.dayEnd);
    setDragged(null);
    updateDays(days);
  };
  const saveCopy = () => {
    const timestamp = new Date().toISOString();
    const copy: Itinerary = {
      ...itinerary,
      id: `trip-${Date.now()}`,
      input: { ...itinerary.input, name: `${itinerary.input.name} copy` },
      createdAt: timestamp,
      updatedAt: timestamp,
    };
    try { saveGuestItinerary(copy); setStatus(`Saved “${copy.input.name}” as a separate trip.`); } catch { setStatus("Saving the copy failed. Check browser storage permissions."); }
  };
  const share = async () => {
    const encoded = btoa(unescape(encodeURIComponent(JSON.stringify(itinerary))));
    const url = `${window.location.origin}/share/local#${encoded}`;
    try { await navigator.clipboard.writeText(url); setStatus("Read-only link copied."); } catch { setStatus(`Copy this link: ${url}`); }
  };

  return (
    <section className="itinerary-shell">
      <div className="itinerary-header">
        <div><p className="eyebrow">{readOnly ? "SHARED ITINERARY" : "EDITABLE ITINERARY"}</p><h1>{itinerary.input.name}</h1><p>{itinerary.input.startDate} → {itinerary.input.endDate} · {itinerary.input.pace} pace</p></div>
        {!readOnly && <button className="text-button" type="button" onClick={onClose}>← Trip setup</button>}
      </div>
      {itinerary.warnings.map((warning) => <p className="notice notice-muted" key={warning}>{warning}</p>)}
      <EditorActionBar
        onCalendar={() => download(`${itinerary.input.name.replace(/\W+/g, "-").toLowerCase()}.ics`, itineraryToIcs(itinerary), "text/calendar")}
        onPrint={() => window.print()}
        onSaveCopy={saveCopy}
        onShare={share}
        readOnly={readOnly}
      />
      {status && <p className="status" role="status">{status}</p>}
      <div className="day-list">
        {itinerary.days.map((day, dayIndex) => (
          <ItineraryDayCard
            day={day}
            key={day.date}
            onDragStart={(stopIndex) => setDragged({ dayIndex, stopIndex })}
            onDrop={(stopIndex) => drop(dayIndex, stopIndex)}
            onMove={(stopIndex, direction) => move(dayIndex, stopIndex, direction)}
            onNotesChange={(stopIndex, notes) => updateStop(dayIndex, stopIndex, { notes })}
            onRemove={(stopIndex) => remove(dayIndex, stopIndex)}
            onTimeChange={(stopIndex, time) => {
              const days = itinerary.days.map((item, index) => index === dayIndex
                ? { ...item, stops: item.stops.map((candidate, candidateIndex) => candidateIndex === stopIndex ? { ...candidate, startTime: time } : candidate) }
                : item);
              days[dayIndex].warnings = findDayConflicts(days[dayIndex], itinerary.input.dayEnd);
              updateDays(days);
            }}
            onToggleLock={(stopIndex) => updateStop(dayIndex, stopIndex, { locked: !day.stops[stopIndex].locked })}
            readOnly={readOnly}
          />
        ))}
      </div>
    </section>
  );
}
