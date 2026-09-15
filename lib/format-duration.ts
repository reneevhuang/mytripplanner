export function formatDuration(minutes: number | null): string {
  if (minutes === null) return "Unknown";

  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  const parts: string[] = [];

  if (hours > 0) parts.push(`${hours} ${hours === 1 ? "hr" : "hrs"}`);
  if (remainingMinutes > 0) parts.push(`${remainingMinutes} ${remainingMinutes === 1 ? "min" : "mins"}`);

  return parts.length > 0 ? parts.join(" ") : "0 mins";
}
