import { describe, expect, it } from "vitest";
import { formatDuration } from "@/lib/format-duration";

describe("formatDuration", () => {
  it.each([
    [null, "Unknown"],
    [0, "0 mins"],
    [45, "45 mins"],
    [60, "1 hr"],
    [90, "1 hr 30 mins"],
    [120, "2 hrs"],
  ])("formats %s minutes as %s", (minutes, expected) => {
    expect(formatDuration(minutes)).toBe(expected);
  });
});
