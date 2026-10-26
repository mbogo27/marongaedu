import path from "node:path";
import type { UploadKind } from "@/lib/storage/types";

const MB = 1024 * 1024;

export const MIME_BY_KIND: Record<UploadKind, string[]> = {
  image: ["image/jpeg", "image/png", "image/webp", "image/gif"],
  video: ["video/mp4", "video/webm", "video/quicktime"],
  caption: ["text/vtt"],
  resource: [
    "application/pdf",
    "application/zip",
    "text/plain",
    "text/csv",
    "image/jpeg",
    "image/png",
    "image/webp",
    "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "application/vnd.ms-excel",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    "application/vnd.ms-powerpoint",
    "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  ],
};

const EXT_BY_MIME: Record<string, string> = {
  "image/jpeg": ".jpg",
  "image/png": ".png",
  "image/webp": ".webp",
  "image/gif": ".gif",
  "video/mp4": ".mp4",
  "video/webm": ".webm",
  "video/quicktime": ".mov",
  "text/vtt": ".vtt",
  "application/pdf": ".pdf",
  "application/zip": ".zip",
  "text/plain": ".txt",
  "text/csv": ".csv",
};

export function maxBytesFor(kind: UploadKind, limits: { videoMb: number; fileMb: number }): number {
  return (kind === "video" ? limits.videoMb : limits.fileMb) * MB;
}

export type UploadCheck = { ok: true; ext: string } | { ok: false; error: string };

/**
 * Validate an upload request by MIME type and size (spec §6). The MIME comes
 * from the client, so the local upload route also sniffs magic bytes.
 */
export function checkUpload(
  kind: UploadKind,
  contentType: string,
  size: number,
  limits: { videoMb: number; fileMb: number },
  filename = ""
): UploadCheck {
  const mime = contentType.toLowerCase().split(";")[0].trim();
  if (!MIME_BY_KIND[kind].includes(mime)) {
    return { ok: false, error: `File type ${mime || "unknown"} is not allowed for ${kind} uploads.` };
  }
  if (!Number.isFinite(size) || size <= 0) return { ok: false, error: "Empty file." };
  const max = maxBytesFor(kind, limits);
  if (size > max) return { ok: false, error: `File is too large (max ${Math.round(max / MB)} MB).` };
  const ext = EXT_BY_MIME[mime] ?? (path.extname(filename).toLowerCase().replace(/[^a-z0-9.]/g, "") || "");
  return { ok: true, ext };
}

/** Magic-byte check for formats we can sniff cheaply. Unknown formats pass. */
export function sniffMatches(mime: string, head: Buffer): boolean {
  const startsWith = (...bytes: number[]) => bytes.every((b, i) => head[i] === b);
  switch (mime) {
    case "image/jpeg":
      return startsWith(0xff, 0xd8, 0xff);
    case "image/png":
      return startsWith(0x89, 0x50, 0x4e, 0x47);
    case "image/gif":
      return startsWith(0x47, 0x49, 0x46, 0x38);
    case "image/webp":
      return head.subarray(0, 4).toString("ascii") === "RIFF" && head.subarray(8, 12).toString("ascii") === "WEBP";
    case "application/pdf":
      return head.subarray(0, 4).toString("ascii") === "%PDF";
    case "video/mp4":
    case "video/quicktime":
      return head.subarray(4, 8).toString("ascii") === "ftyp";
    case "video/webm":
      return startsWith(0x1a, 0x45, 0xdf, 0xa3);
    case "text/vtt":
      return head.subarray(0, 6).toString("ascii") === "WEBVTT" || head.subarray(0, 9).toString("ascii").includes("WEBVTT");
    default:
      return true;
  }
}

export function visibilityOf(key: string): "public" | "private" {
  if (key.startsWith("public/")) return "public";
  if (key.startsWith("private/")) return "private";
  throw new Error(`Storage key must start with public/ or private/: ${key}`);
}
