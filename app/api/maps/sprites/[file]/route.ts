import { getSprites } from "@/lib/providers/maps/amazon-map";

export const runtime = "nodejs";

// Proxies sprite image/json requests used by the Amazon Location map style.
export async function GET(_: Request, { params }: { params: Promise<{ file: string }> }) {
  return getSprites((await params).file);
}