import { createReadStream } from "node:fs";
import { stat } from "node:fs/promises";
import { Readable } from "node:stream";
import { NextResponse } from "next/server";
import { env } from "@/lib/env";
import { LocalStorageProvider, mimeFromKey } from "@/lib/storage/local";
import { visibilityOf } from "@/lib/storage/policy";

// Serves the LOCAL storage provider only (dev / single-node). With S3, objects
// are served by the bucket/CDN and this route is inert.
const storage = new LocalStorageProvider();

export async function GET(req: Request, ctx: RouteContext<"/media/[...key]">) {
  if (env.STORAGE_PROVIDER !== "local") return new NextResponse("Not found", { status: 404 });

  const { key: parts } = await ctx.params;
  const key = parts.map(decodeURIComponent).join("/");

  let abs: string;
  try {
    abs = storage.resolve(key);
  } catch {
    return new NextResponse("Not found", { status: 404 });
  }

  const url = new URL(req.url);
  if (visibilityOf(key) === "private") {
    const exp = Number(url.searchParams.get("exp"));
    const sig = url.searchParams.get("sig") ?? "";
    if (!exp || !storage.verifyRead(key, exp, sig)) {
      return new NextResponse("Forbidden", { status: 403, headers: { "Cache-Control": "no-store" } });
    }
  }

  let size: number;
  try {
    const s = await stat(abs);
    if (!s.isFile()) throw new Error();
    size = s.size;
  } catch {
    return new NextResponse("Not found", { status: 404 });
  }

  const contentType = mimeFromKey(key);
  const cache = visibilityOf(key) === "public" ? "public, max-age=31536000, immutable" : "private, max-age=600";
  const headers: Record<string, string> = {
    "Content-Type": contentType,
    "Accept-Ranges": "bytes",
    "Cache-Control": cache,
    "X-Content-Type-Options": "nosniff",
  };

  // Byte ranges are required for seeking in <video>.
  const range = req.headers.get("range");
  if (range) {
    const m = /^bytes=(\d*)-(\d*)$/.exec(range);
    if (m && (m[1] || m[2])) {
      let start = m[1] ? Number(m[1]) : size - Number(m[2]);
      let end = m[1] && m[2] ? Number(m[2]) : size - 1;
      start = Math.max(0, start);
      end = Math.min(size - 1, end);
      if (start > end || start >= size) {
        return new NextResponse(null, { status: 416, headers: { "Content-Range": `bytes */${size}` } });
      }
      const stream = Readable.toWeb(createReadStream(abs, { start, end })) as ReadableStream;
      return new NextResponse(stream, {
        status: 206,
        headers: { ...headers, "Content-Range": `bytes ${start}-${end}/${size}`, "Content-Length": String(end - start + 1) },
      });
    }
  }

  const stream = Readable.toWeb(createReadStream(abs)) as ReadableStream;
  return new NextResponse(stream, { status: 200, headers: { ...headers, "Content-Length": String(size) } });
}
