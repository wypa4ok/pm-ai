import { z } from "zod";
import { errorResponse } from "./errors";
import { getStorage } from "../storage";

const signSchema = z.object({
  path: z.string().min(3),
  contentType: z.string().min(3),
  bucket: z.string().optional(),
});

export async function handleSignUpload(request: Request) {
  const json = await request.json().catch(() => null);
  const parsed = signSchema.safeParse(json);
  if (!parsed.success) {
    return errorResponse(
      "invalid_request",
      parsed.error.flatten().formErrors.join(", "),
      400,
    );
  }

  const { path, contentType, bucket } = parsed.data;
  const storage = getStorage();

  const { signedUrl, token, expiresAt } = await storage.createSignedUploadUrl({
    bucket: bucket ?? storageDefaults.bucket,
    path,
    expiresInSeconds: 60 * 10, // 10 minutes
  });

  return new Response(
    JSON.stringify({
      signedUrl,
      token,
      path,
      bucket: bucket ?? storageDefaults.bucket,
      contentType,
      expiresAt,
    }),
    { status: 200, headers: { "content-type": "application/json" } },
  );
}

const storageDefaults = {
  bucket: process.env.SUPABASE_STORAGE_BUCKET ?? "attachments",
};
