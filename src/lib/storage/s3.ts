import "server-only";
import {
  DeleteObjectCommand,
  GetObjectCommand,
  HeadObjectCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { env } from "@/lib/env";
import { visibilityOf } from "@/lib/storage/policy";
import type { PresignedUpload, StorageProvider } from "@/lib/storage/types";

/**
 * S3-compatible storage (Cloudflare R2 / AWS S3 / Backblaze). Logical keys
 * "public/x" and "private/x" map to key "x" in the public / private bucket
 * respectively, so the private bucket can stay fully locked down.
 */
export class S3StorageProvider implements StorageProvider {
  readonly id = "s3" as const;
  private client = new S3Client({
    region: env.S3_REGION,
    endpoint: env.S3_ENDPOINT,
    forcePathStyle: true,
    credentials: { accessKeyId: env.S3_ACCESS_KEY_ID!, secretAccessKey: env.S3_SECRET_ACCESS_KEY! },
  });

  private target(key: string) {
    const vis = visibilityOf(key);
    return {
      Bucket: (vis === "public" ? env.S3_BUCKET_PUBLIC : env.S3_BUCKET_PRIVATE)!,
      Key: key.slice(vis.length + 1),
    };
  }

  async putObject(key: string, body: Buffer, contentType: string) {
    await this.client.send(new PutObjectCommand({ ...this.target(key), Body: body, ContentType: contentType }));
  }

  async getObject(key: string) {
    try {
      const res = await this.client.send(new GetObjectCommand(this.target(key)));
      const bytes = await res.Body!.transformToByteArray();
      return { body: Buffer.from(bytes), contentType: res.ContentType ?? "application/octet-stream" };
    } catch {
      return null;
    }
  }

  async exists(key: string) {
    try {
      await this.client.send(new HeadObjectCommand(this.target(key)));
      return true;
    } catch {
      return false;
    }
  }

  async delete(key: string) {
    await this.client.send(new DeleteObjectCommand(this.target(key)));
  }

  async presignPut(key: string, contentType: string): Promise<PresignedUpload> {
    const url = await getSignedUrl(this.client, new PutObjectCommand({ ...this.target(key), ContentType: contentType }), {
      expiresIn: 15 * 60,
    });
    return { url, method: "PUT", headers: { "Content-Type": contentType } };
  }

  async getSignedUrl(key: string, ttlSec: number) {
    if (visibilityOf(key) === "public") return this.publicUrl(key);
    return getSignedUrl(this.client, new GetObjectCommand(this.target(key)), { expiresIn: ttlSec });
  }

  publicUrl(key: string) {
    return `${env.S3_PUBLIC_BASE_URL!.replace(/\/$/, "")}/${this.target(key).Key}`;
  }
}
