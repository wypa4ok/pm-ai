import { SupabaseStorageAdapter } from "../../../packages/adapters/storage/supabase-storage";
import type { Storage } from "../../../packages/services/ports";

let storageClient: Storage | null = null;

export function getStorage(): Storage {
  if (storageClient) return storageClient;

  const url = process.env.SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const bucket = process.env.SUPABASE_STORAGE_BUCKET ?? "attachments";

  storageClient = new SupabaseStorageAdapter({
    url: url ?? "",
    serviceRoleKey: serviceRoleKey ?? "",
    bucket,
    defaultSignedUrlExpiresInSeconds: 60 * 60, // 1 hour
  });

  return storageClient;
}
