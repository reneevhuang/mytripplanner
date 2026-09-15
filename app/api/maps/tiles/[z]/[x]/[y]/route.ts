import { getTile } from "@/lib/providers/maps/amazon-map";

export const runtime = "nodejs";

export async function GET(_: Request, { params }: { params: Promise<{ z: string; x: string; y: string }> }) {
  const { z, x, y } = await params;
  return getTile(z, x, y);
}

