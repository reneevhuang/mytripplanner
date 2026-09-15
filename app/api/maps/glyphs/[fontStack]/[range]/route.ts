import { getGlyphs } from "@/lib/providers/maps/amazon-map";

export const runtime = "nodejs";

export async function GET(_: Request, { params }: { params: Promise<{ fontStack: string; range: string }> }) {
  const { fontStack, range } = await params;
  return getGlyphs(fontStack, range);
}

