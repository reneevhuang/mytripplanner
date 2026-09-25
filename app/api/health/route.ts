// Reports that the Next.js server is reachable and includes a timestamp for deployment checks.
export function GET() {
  return Response.json({
    status: "ok",
    service: "italy-itinerary",
    timestamp: new Date().toISOString(),
  });
}