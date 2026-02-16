import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { errorResponse } from "~/server/api/errors";
import { withAuth } from "~/server/api/middleware/auth";
import { prisma } from "~/server/db";
import { logger } from "~/server/lib/logger";

const schema = z.object({
  companyName: z.string().optional().nullable(),
  phone: z.string().optional().nullable(),
});

/**
 * POST /api/v1/onboarding/complete
 * Complete landlord onboarding process
 */
export async function POST(request: NextRequest) {
  const authed = await withAuth(request);
  if (authed instanceof Response) return authed;

  const json = await request.json().catch(() => null);
  const parsed = schema.safeParse(json);

  if (!parsed.success) {
    return errorResponse(
      "invalid_request",
      "Invalid onboarding data",
      400
    );
  }

  const { companyName, phone } = parsed.data;

  try {
    // Update user with onboarding info
    await prisma.user.update({
      where: { id: authed.auth.user.id },
      data: {
        companyName,
        phone,
        onboardingCompleted: true,
      },
    });

    logger.info("Onboarding completed successfully", {
      userId: authed.auth.user.id,
      endpoint: "/api/v1/onboarding/complete",
      companyName: companyName ?? undefined,
    });

    return NextResponse.json({
      success: true,
      message: "Onboarding completed successfully",
    });
  } catch (error) {
    logger.error("Onboarding completion failed", {
      userId: authed.auth.user.id,
      endpoint: "/api/v1/onboarding/complete",
    }, error);
    return errorResponse(
      "internal_error",
      "Failed to complete onboarding",
      500
    );
  }
}
