import { getStyleDescriptor } from "@/lib/providers/maps/amazon-map";

export const runtime = "nodejs";

export async function GET(request: Request) {
  return getStyleDescriptor(new URL(request.url).origin);
}
