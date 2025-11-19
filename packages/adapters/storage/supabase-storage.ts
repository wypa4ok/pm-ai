import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type {
  Storage,
  StoragePutParams,
  StoragePutResult,
  StorageSignedUploadResult,
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

    // Allow caller to pass a different bucket; default to adapter bucket.
    const bucket = params.bucket || this.bucket;

    const { error } = await this.client.storage.from(bucket).upload(path, payload, {
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

  async createSignedUploadUrl(params: {
    bucket?: string;
    path: string;
    expiresInSeconds?: number;
  }): Promise<StorageSignedUploadResult> {
    const bucket = params.bucket || this.bucket;
    const path = this.normalizePath(params.path);
    const expires =
      params.expiresInSeconds && params.expiresInSeconds > 0
        ? params.expiresInSeconds
        : this.defaultExpiresIn;

    const { data, error } = await this.client.storage
      .from(bucket)
      .createSignedUploadUrl(path, expires);

    if (error || !data?.signedUrl || !data.path || !data.token) {
      throw new Error(
        `Failed to create signed upload URL for ${bucket}/${path}: ${
          error?.message ?? "Unknown error"
        }`,
      );
    }

    return {
      signedUrl: data.signedUrl,
      token: data.token,
      path: data.path,
      bucket,
      expiresAt: new Date(Date.now() + expires * 1000),
    };
  }

  private normalizePath(path: string): string {
    return path.replace(/^\//, "");
  }
}
