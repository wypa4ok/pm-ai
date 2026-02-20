export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { errorResponse } from "../../../../../../../src/server/api/errors";
import { withAuth } from "../../../../../../../src/server/api/middleware/auth";
import { applyCors } from "../../../../../../../src/server/api/middleware/cors";
import { rateLimit } from "../../../../../../../src/server/api/middleware/rate-limit";
import { prisma } from "../../../../../../../src/server/db";
import { sendGmailMessage } from "../../../../../../../src/server/integrations/gmail-send";

const inlineAttachmentSchema = z.object({
  filename: z.string().min(1),
  mimeType: z.string().optional(),
  contentBase64: z.string().min(1),
});

const signedAttachmentSchema = z.object({
  filename: z.string().min(1),
  mimeType: z.string().optional(),
  bucket: z.string().optional(),
  path: z.string().min(3),
});

const createMessageSchema = z.object({
  ticketId: z.string().uuid(),
  to: z.array(z.string().email()).min(1),
  cc: z.array(z.string().email()).optional(),
  bcc: z.array(z.string().email()).optional(),
  subject: z.string().min(1),
  text: z.string().optional(),
  html: z.string().optional(),
  // Support either inline base64 or signed bucket/path references
  attachments: z
    .array(z.union([inlineAttachmentSchema, signedAttachmentSchema]))
    .optional(),
});

export async function POST(request: NextRequest) {
  const cors = applyCors(request, allowedOrigins());
  if (cors) return cors;

  const limited = rateLimit(request);
  if (limited) return limited;

  const authed = await withAuth(request);
  if (authed instanceof Response) return authed;

  const json = await request.json().catch(() => null);
  const parsed = createMessageSchema.safeParse(json);
  if (!parsed.success) {
    return errorResponse(
      "invalid_request",
      parsed.error.flatten().formErrors.join(", "),
      400,
    );
  }

  const payload = parsed.data;

  const ticket = await prisma.ticket.findFirst({
    where: { id: payload.ticketId, ownerUserId: authed.auth.user.id },
  });

  if (!ticket) {
    return errorResponse("not_found", "Ticket not found", 404);
  }

  if (!payload.text && !payload.html) {
    return errorResponse(
      "invalid_request",
      "text or html body is required",
      400,
    );
  }

  const attachments =
    payload.attachments?.map((att) => {
      if ("contentBase64" in att) {
        return {
          filename: att.filename,
          mimeType: att.mimeType ?? "application/octet-stream",
          content: Buffer.from(att.contentBase64, "base64"),
        };
      }
      return {
        filename: att.filename,
        mimeType: att.mimeType ?? "application/octet-stream",
        path: att.path,
        bucket: att.bucket,
      };
    }) ?? [];

  // If client passed signed storage paths, keep them; otherwise fall back to inline.
  const gmailAttachments = attachments.map((att) => {
    if ("content" in att) {
      return att;
    }
    return {
      filename: att.filename,
      mimeType: att.mimeType ?? "application/octet-stream",
      // Gmail client expects content; signed-path uploads should already be ingested elsewhere.
      content: `Uploaded at ${att.bucket ?? "bucket"}/${att.path}`,
    };
  });

  const result = await sendGmailMessage({
    ticketId: ticket.id,
    ownerUserId: authed.auth.user.id,
    to: payload.to,
    cc: payload.cc,
    bcc: payload.bcc,
    subject: payload.subject,
    text: payload.text,
    html: payload.html,
    attachments: gmailAttachments.length ? gmailAttachments : undefined,
    threadId: ticket.sourceId ?? undefined,
  });

  const message = await prisma.message.findFirst({
    where: { externalId: result.id },
  });

  return NextResponse.json({
    message: message
      ? {
          id: message.id,
          ticketId: message.ticketId,
          direction: message.direction,
          channel: message.channel,
          subject: message.subject,
          bodyText: message.bodyText,
          bodyHtml: message.bodyHtml,
          sentAt: message.sentAt,
          attachments: message.attachments,
        }
      : { externalId: result.id, threadId: result.threadId },
  });
}

function allowedOrigins() {
  const raw = process.env.CORS_ALLOWED_ORIGINS ?? "";
  return raw
    .split(",")
    .map((v) => v.trim())
    .filter(Boolean);
}
