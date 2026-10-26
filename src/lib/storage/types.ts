/**
 * Storage abstraction (spec §8). Logical keys start with "public/" or
 * "private/". Public objects are served directly; private objects (lesson
 * videos, captions, resources, certificates) are only reachable through
 * short-lived signed URLs issued after an access check.
 */
export type PresignedUpload = {
  url: string;
  method: "PUT";
  headers: Record<string, string>;
};

export interface StorageProvider {
  readonly id: "local" | "s3";

  /** Server-side write (small files: avatars, generated PDFs). */
  putObject(key: string, body: Buffer, contentType: string): Promise<void>;
  /** Server-side read (cached PDFs, placeholder copies). Null when absent. */
  getObject(key: string): Promise<{ body: Buffer; contentType: string } | null>;
  exists(key: string): Promise<boolean>;
  delete(key: string): Promise<void>;

  /** Direct-to-storage upload target so large videos never stream through Next.js. */
  presignPut(key: string, contentType: string, maxBytes: number): Promise<PresignedUpload>;
  /** Time-limited read URL for private objects. */
  getSignedUrl(key: string, ttlSec: number): Promise<string>;
  /** Stable URL for public objects. */
  publicUrl(key: string): string;
}

export type UploadKind = "image" | "video" | "caption" | "resource";
