import "server-only";
import { mkdir, writeFile } from "fs/promises";
import path from "path";
import { nanoid } from "nanoid";

const UPLOAD_ROOT = path.join(process.cwd(), "public", "uploads", "runtime");

/**
 * Local-disk stub for a real object store (S3/R2/etc). Everything else in the
 * app talks to this interface, so swapping the implementation later is a
 * one-file change.
 */
export async function saveUpload(file: File, subdir: string): Promise<string> {
  const dir = path.join(UPLOAD_ROOT, subdir);
  await mkdir(dir, { recursive: true });

  const ext = path.extname(file.name) || "";
  const filename = `${nanoid(12)}${ext}`;
  const buffer = Buffer.from(await file.arrayBuffer());
  await writeFile(path.join(dir, filename), buffer);

  return `/uploads/runtime/${subdir}/${filename}`;
}
