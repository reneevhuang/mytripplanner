import { z } from "zod";
import { rawPlaceSchema } from "@/lib/catalog/schema";
import { AmazonLocationProvider } from "@/lib/providers/maps/amazon-location";
import { MapProviderError } from "@/lib/providers/maps/types";

const requestSchema = z.object({
  legs: z.array(z.object({
    from: rawPlaceSchema,
    to: rawPlaceSchema,
    mode: z.enum(["walking", "driving", "transit"]).default("walking"),
  })).max(30),
});

export async function POST(request: Request) {
  const parsed = requestSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return Response.json({ error: "Invalid route request.", details: parsed.error.flatten() }, { status: 400 });
  }

  const provider = new AmazonLocationProvider();
  try {
    const routes = await Promise.all(parsed.data.legs.map((leg) => provider.route(leg.from, leg.to, leg.mode)));
    return Response.json({ routes });
  } catch (error) {
    if (error instanceof MapProviderError) {
      return Response.json({ error: error.message, code: error.code }, { status: error.code === "not-configured" ? 503 : 502 });
    }
    return Response.json({ error: "Routing provider failed." }, { status: 502 });
  }
}
