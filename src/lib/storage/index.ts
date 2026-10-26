import "server-only";
import { randomBytes } from "node:crypto";
import { env } from "@/lib/env";
import { LocalStorageProvider } from "@/lib/storage/local";
import { S3StorageProvider } from "@/lib/storage/s3";
import { checkUpload } from "@/lib/storage/policy";
import type { StorageProvider, UploadKind } from "@/lib/storage/types";

export type { StorageProvider, UploadKind } from "@/lib/storage/types";

let provider: StorageProvider | undefined;
export function getStorage(): StorageProvider {
  provider ??= env.STORAGE_PROVIDER === "s3" ? new S3StorageProvider() : new LocalStorageProvider();
  return provider;
}

export const SIGNED_URL_TTL_SEC = 60 * 60; // spec §8: default 1h

export function uploadLimits() {
  return { videoMb: env.MAX_VIDEO_MB, fileMb: env.MAX_FILE_MB };
}

/** e.g. newKey("public", "thumbnails", ".jpg") → "public/thumbnails/3f9c….jpg" */
export function newKey(visibility: "public" | "private", folder: string, ext: string): string {
  return `${visibility}/${folder}/${randomBytes(12).toString("hex")}${ext}`;
}

/** Where each upload kind lives: media shown on public pages vs paid content. */
export const UPLOAD_TARGETS = {
  thumbnail: { kind: "image", visibility: "public", folder: "thumbnails" },
  ogImage: { kind: "image", visibility: "public", folder: "og" },
  avatar: { kind: "image", visibility: "public", folder: "avatars" },
  certificateAsset: { kind: "image", visibility: "public", folder: "certificate" },
  siteAsset: { kind: "image", visibility: "public", folder: "site" },
  previewVideo: { kind: "video", visibility: "public", folder: "preview" },
  lessonVideo: { kind: "video", visibility: "private", folder: "lessons" },
  caption: { kind: "caption", visibility: "private", folder: "captions" },
  resource: { kind: "resource", visibility: "private", folder: "resources" },
} as const satisfies Record<string, { kind: UploadKind; visibility: "public" | "private"; folder: string }>;

export type UploadTarget = keyof typeof UPLOAD_TARGETS;

/** Validate then mint a presigned upload for an admin-facing file picker. */
export async function createPresignedUpload(target: UploadTarget, filename: string, contentType: string, size: number) {
  const t = UPLOAD_TARGETS[target];
  const limits = uploadLimits();
  const check = checkUpload(t.kind, contentType, size, limits, filename);
  if (!check.ok) return { ok: false as const, error: check.error };
  const key = newKey(t.visibility, t.folder, check.ext);
  const maxBytes = (t.kind === "video" ? limits.videoMb : limits.fileMb) * 1024 * 1024;
  const upload = await getStorage().presignPut(key, contentType, maxBytes);
  return { ok: true as const, key, upload };
}

/** Resolve a stored value (key or legacy URL) to something a browser can load. */
export function mediaUrl(value: string | null | undefined): string {
  if (!value) return "";
  if (/^https?:\/\//.test(value) || value.startsWith("/")) return value;
  return getStorage().publicUrl(value);
}
