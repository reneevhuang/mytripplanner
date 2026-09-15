import {
  GetMapGlyphsCommand,
  GetMapSpritesCommand,
  GetMapStyleDescriptorCommand,
  GetMapTileCommand,
  LocationClient,
  type GetMapGlyphsCommandOutput,
  type GetMapSpritesCommandOutput,
  type GetMapStyleDescriptorCommandOutput,
  type GetMapTileCommandOutput,
} from "@aws-sdk/client-location";

type MapBlobOutput =
  | GetMapGlyphsCommandOutput
  | GetMapSpritesCommandOutput
  | GetMapStyleDescriptorCommandOutput
  | GetMapTileCommandOutput;

const region = process.env.AMAZON_LOCATION_REGION ?? process.env.AWS_REGION ?? process.env.AWS_DEFAULT_REGION ?? "us-west-2";
const mapName = process.env.AMAZON_LOCATION_MAP_NAME ?? "MyTripPlannerMap";
const client = new LocationClient({ region });

async function blobResponse(output: MapBlobOutput): Promise<Response> {
  if (!output.Blob) return new Response("Map asset was empty.", { status: 502 });
  const bytes = output.Blob;
  const body = new ArrayBuffer(bytes.byteLength);
  new Uint8Array(body).set(bytes);
  return new Response(body, {
    headers: {
      "Cache-Control": output.CacheControl ?? "public, max-age=86400",
      "Content-Type": output.ContentType ?? "application/octet-stream",
    },
  });
}

export async function getStyleDescriptor(origin: string) {
  const output = await client.send(new GetMapStyleDescriptorCommand({ MapName: mapName }));
  if (!output.Blob) return new Response("Map style was empty.", { status: 502 });
  const style = JSON.parse(await output.Blob.transformToString()) as {
    sources?: Record<string, { tiles?: string[] }>;
    sprite?: string;
    glyphs?: string;
  };

  for (const source of Object.values(style.sources ?? {})) {
    if (source.tiles) source.tiles = [`${origin}/api/maps/tiles/{z}/{x}/{y}`];
  }
  style.sprite = `${origin}/api/maps/sprites/sprites`;
  style.glyphs = `${origin}/api/maps/glyphs/{fontstack}/{range}.pbf`;

  return Response.json(style, {
    headers: {
      "Cache-Control": "no-store",
    },
  });
}

export async function getTile(z: string, x: string, y: string) {
  return blobResponse(await client.send(new GetMapTileCommand({ MapName: mapName, Z: z, X: x, Y: y })));
}

export async function getSprites(fileName: string) {
  return blobResponse(await client.send(new GetMapSpritesCommand({ MapName: mapName, FileName: fileName })));
}

export async function getGlyphs(fontStack: string, fontUnicodeRange: string) {
  return blobResponse(await client.send(new GetMapGlyphsCommand({
    MapName: mapName,
    FontStack: fontStack,
    FontUnicodeRange: fontUnicodeRange,
  })));
}
