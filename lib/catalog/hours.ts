import type { ParsedHours } from "./schema";

const SIMPLE_RANGE = /^(?:Daily\s+)?(\d{1,2})(?::(\d{2}))?\s*-\s*(\d{1,2})(?::(\d{2}))?$/i;

export function parseSimpleHours(value: string | null): ParsedHours | null {
  if (!value) return null;
  const match = value.trim().match(SIMPLE_RANGE);
  if (!match) return null;

  const openMinutes = Number(match[1]) * 60 + Number(match[2] ?? 0);
  const closeMinutes = Number(match[3]) * 60 + Number(match[4] ?? 0);
  if (openMinutes >= closeMinutes || closeMinutes > 24 * 60) return null;

  return { openMinutes, closeMinutes };
}

export function minutesFromTime(value: string): number {
  const [hours, minutes] = value.split(":").map(Number);
  return hours * 60 + minutes;
}

export function timeFromMinutes(value: number): string {
  const bounded = Math.max(0, Math.min(value, 24 * 60 - 1));
  return `${String(Math.floor(bounded / 60)).padStart(2, "0")}:${String(bounded % 60).padStart(2, "0")}`;
}

export function roundUpToHalfHour(value: number): number {
  return Math.ceil(value / 30) * 30;
}
