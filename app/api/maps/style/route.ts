import { getStyleDescriptor } from "@/lib/providers/maps/amazon-map";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const fallbackUrl = new URL(request.url);
  const host = request.headers.get("x-forwarded-host") ?? request.headers.get("host") ?? fallbackUrl.host;
  const protocol = request.headers.get("x-forwarded-proto") ?? fallbackUrl.protocol.replace(":", "");
  return getStyleDescriptor(`${protocol}://${host}`);
}
