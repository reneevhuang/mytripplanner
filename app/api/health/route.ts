export function GET() {
  return Response.json({
    status: "ok",
    service: "italy-itinerary",
    timestamp: new Date().toISOString(),
  });
}
