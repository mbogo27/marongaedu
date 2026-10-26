import { createWriteStream } from "node:fs";
import { mkdir, open, rm } from "node:fs/promises";
import path from "node:path";
import { Readable } from "node:stream";
import { pipeline } from "node:stream/promises";
import { NextResponse } from "next/server";
import { env } from "@/lib/env";
import { LocalStorageProvider } from "@/lib/storage/local";
import { sniffMatches } from "@/lib/storage/policy";

const storage = new LocalStorageProvider();

/**
 * Local equivalent of an S3 presigned PUT: the URL is HMAC-signed and
 * expiring (minted by createPresignedUpload after an admin auth check), pins
 * the key / content-type / max size, and the body is streamed to disk with a
 * running byte cap, then magic-byte sniffed.
 */
export async function PUT(req: Request) {
  if (env.STORAGE_PROVIDER !== "local") return NextResponse.json({ error: "Not found" }, { status: 404 });

  const q = new URL(req.url).searchParams;
  const key = q.get("key") ?? "";
  const exp = Number(q.get("exp"));
  const ct = q.get("ct") ?? "";
  const max = Number(q.get("max"));
  const sig = q.get("sig") ?? "";

  if (!key || !exp || !max || !storage.verifyWrite(key, exp, ct, max, sig)) {
    return NextResponse.json({ error: "Invalid or expired upload URL" }, { status: 403 });
  }
  if ((req.headers.get("content-type") ?? "").split(";")[0].trim() !== ct) {
    return NextResponse.json({ error: "Content-Type mismatch" }, { status: 415 });
  }
  const declared = Number(req.headers.get("content-length") ?? 0);
  if (declared > max) return NextResponse.json({ error: "File too large" }, { status: 413 });
  if (!req.body) return NextResponse.json({ error: "Empty body" }, { status: 400 });

  const abs = storage.resolve(key);
  await mkdir(path.dirname(abs), { recursive: true });

  let written = 0;
  const counter = new TransformStream<Uint8Array, Uint8Array>({
    transform(chunk, controller) {
      written += chunk.byteLength;
      if (written > max) throw new Error("too-large");
      controller.enqueue(chunk);
    },
  });

  try {
    await pipeline(Readable.fromWeb(req.body.pipeThrough(counter) as never), createWriteStream(abs));
  } catch (e) {
    await rm(abs, { force: true });
    const tooLarge = e instanceof Error && e.message === "too-large";
    return NextResponse.json({ error: tooLarge ? "File too large" : "Upload failed" }, { status: tooLarge ? 413 : 500 });
  }

  const fh = await open(abs, "r");
  const head = Buffer.alloc(16);
  await fh.read(head, 0, 16, 0);
  await fh.close();
  if (!sniffMatches(ct, head)) {
    await rm(abs, { force: true });
    return NextResponse.json({ error: "File content does not match its declared type" }, { status: 415 });
  }

  return NextResponse.json({ ok: true, key, size: written });
}
