import { getStyleDescriptor } from "@/lib/providers/maps/amazon-map";

export const runtime = "nodejs";

// Returns an Amazon Location map style rewritten to point at this app's proxy routes.
export async function GET(request: Request) {
  const fallbackUrl = new URL(request.url);
  const host = request.headers.get("x-forwarded-host") ?? request.headers.get("host") ?? fallbackUrl.host;
  const protocol = request.headers.get("x-forwarded-proto") ?? fallbackUrl.protocol.replace(":", "");
  try {
    return await getStyleDescriptor(`${protocol}://${host}`);
  } catch (error) {
    console.error("Amazon Location map style failed.", error);
    return Response.json({
      version: 8,
      sources: {},
      layers: [
        {
          id: "fallback-background",
          type: "background",
          paint: { "background-color": "#e8f4f8" },
        },
      ],
    });
  }
}