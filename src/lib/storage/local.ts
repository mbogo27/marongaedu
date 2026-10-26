import "server-only";
import { mkdir, readFile, rm, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import { hmac, safeEqual } from "@/lib/tokens";
import { env } from "@/lib/env";
import { visibilityOf } from "@/lib/storage/policy";
import type { PresignedUpload, StorageProvider } from "@/lib/storage/types";

const MIME_BY_EXT: Record<string, string> = {
  ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".png": "image/png", ".webp": "image/webp", ".gif": "image/gif",
  ".svg": "image/svg+xml", ".mp4": "video/mp4", ".webm": "video/webm", ".mov": "video/quicktime",
  ".vtt": "text/vtt", ".pdf": "application/pdf", ".zip": "application/zip", ".txt": "text/plain", ".csv": "text/csv",
};

export function mimeFromKey(key: string): string {
  return MIME_BY_EXT[path.extname(key).toLowerCase()] ?? "application/octet-stream";
}

/**
 * Dev storage on local disk (default `.storage/`, gitignored). Public files
 * are served by /media/[...key] without a signature; private files need the
 * HMAC-signed query that `getSignedUrl` mints. Uploads go through
 * /api/upload/local with the same kind of signed, expiring URL — mirroring
 * how S3 presigned URLs behave so the client code is identical.
 */
export class LocalStorageProvider implements StorageProvider {
  readonly id = "local" as const;
  private root = path.resolve(/*turbopackIgnore: true*/ process.cwd(), env.STORAGE_LOCAL_DIR);

  /** Absolute path for a key; rejects traversal outside the storage root. */
  resolve(key: string): string {
    visibilityOf(key);
    const abs = path.resolve(this.root, key);
    if (!abs.startsWith(this.root + path.sep)) throw new Error("Invalid storage key");
    return abs;
  }

  private sign(purpose: string, key: string, exp: number, extra = ""): string {
    return hmac(env.AUTH_SECRET, `${purpose}:${key}:${exp}:${extra}`);
  }

  verifyRead(key: string, exp: number, sig: string): boolean {
    return exp > Date.now() / 1000 && safeEqual(this.sign("read", key, exp), sig);
  }

  verifyWrite(key: string, exp: number, contentType: string, maxBytes: number, sig: string): boolean {
    return exp > Date.now() / 1000 && safeEqual(this.sign("write", key, exp, `${contentType}:${maxBytes}`), sig);
  }

  async putObject(key: string, body: Buffer): Promise<void> {
    const file = this.resolve(key);
    await mkdir(path.dirname(file), { recursive: true });
    await writeFile(file, body);
  }

  async getObject(key: string) {
    try {
      return { body: await readFile(this.resolve(key)), contentType: mimeFromKey(key) };
    } catch {
      return null;
    }
  }

  async exists(key: string) {
    try {
      return (await stat(this.resolve(key))).isFile();
    } catch {
      return false;
    }
  }

  async delete(key: string) {
    await rm(this.resolve(key), { force: true });
  }

  async presignPut(key: string, contentType: string, maxBytes: number): Promise<PresignedUpload> {
    const exp = Math.floor(Date.now() / 1000) + 15 * 60;
    const sig = this.sign("write", key, exp, `${contentType}:${maxBytes}`);
    const qs = new URLSearchParams({ key, exp: String(exp), ct: contentType, max: String(maxBytes), sig });
    return { url: `/api/upload/local?${qs}`, method: "PUT", headers: { "Content-Type": contentType } };
  }

  async getSignedUrl(key: string, ttlSec: number) {
    if (visibilityOf(key) === "public") return this.publicUrl(key);
    const exp = Math.floor(Date.now() / 1000) + ttlSec;
    return `/media/${key}?exp=${exp}&sig=${this.sign("read", key, exp)}`;
  }

  publicUrl(key: string) {
    return `/media/${key}`;
  }
}
