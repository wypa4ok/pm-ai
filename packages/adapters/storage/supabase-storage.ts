import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type {
  Storage,
  StoragePutParams,
  StoragePutResult,
} from "../../services/ports";

export interface SupabaseStorageAdapterOptions {
  url: string;
  serviceRoleKey: string;
  bucket: string;
  defaultSignedUrlExpiresInSeconds?: number;
}

export class SupabaseStorageAdapter implements Storage {
  private readonly client: SupabaseClient;
  private readonly bucket: string;
  private readonly defaultExpiresIn: number;

  constructor(private readonly options: SupabaseStorageAdapterOptions) {
    if (!options.url) {
      throw new Error("SupabaseStorageAdapter requires a Supabase URL.");
    }
    if (!options.serviceRoleKey) {
      throw new Error(
        "SupabaseStorageAdapter requires a Supabase service role key.",
      );
    }
    if (!options.bucket) {
      throw new Error("SupabaseStorageAdapter requires a bucket name.");
    }

    this.bucket = options.bucket;
    this.defaultExpiresIn =
      options.defaultSignedUrlExpiresInSeconds && options.defaultSignedUrlExpiresInSeconds > 0
        ? options.defaultSignedUrlExpiresInSeconds
        : 3600;

    this.client = createClient(options.url, options.serviceRoleKey, {
      auth: {
        persistSession: false,
      },
    });
  }

  async putObject(params: StoragePutParams): Promise<StoragePutResult> {
    const path = this.normalizePath(params.path);
    const payload =
      typeof params.body === "string" ? Buffer.from(params.body) : params.body;

    const { error } = await this.client.storage.from(this.bucket).upload(path, payload, {
      contentType: params.contentType,
      cacheControl: params.cacheControl,
      upsert: true,
    });

    if (error) {
      throw new Error(`Failed to upload object to Supabase Storage: ${error.message}`);
    }

    const expiresIn = this.defaultExpiresIn;
    const signed = await this.client.storage
      .from(this.bucket)
      .createSignedUrl(path, expiresIn);

    if (signed.error || !signed.data?.signedUrl) {
      throw new Error(
        `Uploaded object but failed to create signed URL: ${
          signed.error?.message ?? "Unknown error"
        }`,
      );
    }

    return {
      signedUrl: signed.data.signedUrl,
      expiresAt: new Date(Date.now() + expiresIn * 1000),
    };
  }

  async getSignedUrl(
    bucket: string,
    path: string,
    expiresInSeconds: number,
  ): Promise<string> {
    const normalizedPath = this.normalizePath(path);
    const targetBucket = bucket || this.bucket;
    const expires =
      expiresInSeconds && expiresInSeconds > 0
        ? expiresInSeconds
        : this.defaultExpiresIn;

    const { data, error } = await this.client.storage
      .from(targetBucket)
      .createSignedUrl(normalizedPath, expires);

    if (error || !data?.signedUrl) {
      throw new Error(
        `Failed to create signed URL for ${targetBucket}/${normalizedPath}: ${
          error?.message ?? "Unknown error"
        }`,
      );
    }

    return data.signedUrl;
  }

  async removeObject(bucket: string, path: string): Promise<void> {
    const normalizedPath = this.normalizePath(path);
    const targetBucket = bucket || this.bucket;
    const { error } = await this.client.storage
      .from(targetBucket)
      .remove([normalizedPath]);

    if (error) {
      throw new Error(
        `Failed to remove object ${targetBucket}/${normalizedPath}: ${error.message}`,
      );
    }
  }

  private normalizePath(path: string): string {
    return path.replace(/^\//, "");
  }
}
