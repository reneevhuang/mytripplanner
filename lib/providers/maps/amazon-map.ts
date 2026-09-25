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
const MAP_ASSET_CACHE = "public, max-age=86400, s-maxage=604800, stale-while-revalidate=86400";
const MAP_STYLE_CACHE = "public, max-age=300, s-maxage=86400, stale-while-revalidate=3600";

// Converts an Amazon map asset blob into a cacheable HTTP response.
async function blobResponse(output: MapBlobOutput): Promise<Response> {
  if (!output.Blob) return new Response("Map asset was empty.", { status: 502 });
  const bytes = output.Blob;
  const body = new ArrayBuffer(bytes.byteLength);
  new Uint8Array(body).set(bytes);
  return new Response(body, {
    headers: {
      "Cache-Control": MAP_ASSET_CACHE,
      "Content-Type": output.ContentType ?? "application/octet-stream",
    },
  });
}

// Fetches the Amazon map style and rewrites asset URLs to local proxy routes.
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
      "Cache-Control": MAP_STYLE_CACHE,
    },
  });
}

// Fetches one Amazon Location map tile.
export async function getTile(z: string, x: string, y: string) {
  return blobResponse(await client.send(new GetMapTileCommand({ MapName: mapName, Z: z, X: x, Y: y })));
}

// Fetches Amazon Location sprite metadata or image data.
export async function getSprites(fileName: string) {
  return blobResponse(await client.send(new GetMapSpritesCommand({ MapName: mapName, FileName: fileName })));
}

// Fetches Amazon Location font glyph data.
export async function getGlyphs(fontStack: string, fontUnicodeRange: string) {
  return blobResponse(await client.send(new GetMapGlyphsCommand({
    MapName: mapName,
    FontStack: fontStack,
    FontUnicodeRange: fontUnicodeRange,
  })));
}