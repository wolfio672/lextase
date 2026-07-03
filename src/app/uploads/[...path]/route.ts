import { NextRequest, NextResponse } from "next/server";
import { getStore } from "@netlify/blobs";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
  const { path } = await params;
  const key = path.join("/");

  const store = getStore({ name: "uploads", consistency: "strong" });
  const result = await store.getWithMetadata(key, { type: "arrayBuffer" });
  if (!result) {
    return new NextResponse(null, { status: 404 });
  }

  const contentType = (result.metadata?.contentType as string | undefined) ?? "application/octet-stream";
  return new NextResponse(result.data, {
    headers: {
      "Content-Type": contentType,
      "Cache-Control": "public, max-age=31536000, immutable",
    },
  });
}
