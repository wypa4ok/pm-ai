import { NextRequest } from "next/server";
import { handleSignUpload } from "../../../../../../../../src/server/api/uploads";
import { withAuth } from "../../../../../../../../src/server/api/middleware/auth";
import { applyCors } from "../../../../../../../../src/server/api/middleware/cors";
import { rateLimit } from "../../../../../../../../src/server/api/middleware/rate-limit";

export async function POST(request: NextRequest) {
  const cors = applyCors(request, allowedOrigins());
  if (cors) return cors;

  const limited = rateLimit(request);
  if (limited) return limited;

  const authed = await withAuth(request);
  if (authed instanceof Response) return authed;
  return handleSignUpload(request);
}

function allowedOrigins() {
  const raw = process.env.CORS_ALLOWED_ORIGINS ?? "";
  return raw
    .split(",")
    .map((v) => v.trim())
    .filter(Boolean);
}
