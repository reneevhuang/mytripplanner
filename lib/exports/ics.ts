import type { Itinerary } from "@/lib/planner/types";

function escapeIcs(value: string): string {
  return value.replaceAll("\\", "\\\\").replaceAll(",", "\\,").replaceAll(";", "\\;").replace(/\r?\n/g, "\\n");
}

function localDateTime(date: string, time: string): string {
  return `${date.replaceAll("-", "")}T${time.replace(":", "")}00`;
}

function addMinutes(time: string, minutes: number): string {
  const [hours, mins] = time.split(":").map(Number);
  const total = hours * 60 + mins + minutes;
  return `${String(Math.floor(total / 60) % 24).padStart(2, "0")}:${String(total % 60).padStart(2, "0")}`;
}

export function itineraryToIcs(itinerary: Itinerary): string {
  const events = itinerary.days.flatMap((day) =>
    day.stops.map((stop) =>
      [
        "BEGIN:VEVENT",
        `UID:${escapeIcs(stop.id)}@italy-itinerary`,
        `DTSTAMP:${new Date(itinerary.updatedAt).toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "")}`,
        `DTSTART;TZID=Europe/Rome:${localDateTime(day.date, stop.startTime)}`,
        `DTEND;TZID=Europe/Rome:${localDateTime(day.date, addMinutes(stop.startTime, stop.durationMinutes))}`,
        `SUMMARY:${escapeIcs(stop.place.name)}`,
        `LOCATION:${escapeIcs([stop.place.neighborhood, stop.place.city, stop.place.region].filter(Boolean).join(", "))}`,
        `GEO:${stop.place.latitude};${stop.place.longitude}`,
        `DESCRIPTION:${escapeIcs([stop.place.description, ...stop.warnings, stop.notes].filter(Boolean).join("\n\n"))}`,
        "END:VEVENT",
      ].join("\r\n"),
    ),
  );
  return ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//Italy Itinerary//EN", "CALSCALE:GREGORIAN", ...events, "END:VCALENDAR", ""].join("\r\n");
}
