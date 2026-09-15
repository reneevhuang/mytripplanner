import { getSprites } from "@/lib/providers/maps/amazon-map";

export const runtime = "nodejs";

export async function GET(_: Request, { params }: { params: Promise<{ file: string }> }) {
  return getSprites((await params).file);
}

