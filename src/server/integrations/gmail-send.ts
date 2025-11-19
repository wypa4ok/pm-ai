import { MessageChannel, MessageDirection } from "@prisma/client";
import type { EmailSendAttachmentInput } from "../../../packages/services/ports";
import { logMessage } from "../db";
import { createGmailClient, requireEnv } from "./gmail";

export interface GmailSendParams {
  ticketId: string;
  ownerUserId: string;
  to: string[];
  cc?: string[];
  bcc?: string[];
  subject: string;
  text?: string;
  html?: string;
  attachments?: EmailSendAttachmentInput[];
  threadId?: string;
  replyTo?: string;
  metadata?: Record<string, unknown>;
}

export interface GmailSendResult {
  id: string;
  threadId: string;
}

export async function sendGmailMessage(
  params: GmailSendParams,
): Promise<GmailSendResult> {
  const client = createGmailClient();

  const response = await client.send({
    to: params.to,
    cc: params.cc,
    bcc: params.bcc,
    subject: params.subject,
    text: params.text,
    html: params.html,
    attachments: params.attachments,
    threadId: params.threadId,
    replyTo: params.replyTo ?? requireEnv("GMAIL_FROM_ADDRESS"),
  });

  await logMessage({
    ticketId: params.ticketId,
    ownerUserId: params.ownerUserId,
    direction: MessageDirection.OUTBOUND,
    channel: MessageChannel.EMAIL,
    subject: params.subject,
    bodyText: params.text ?? null,
    bodyHtml: params.html ?? null,
    attachments: buildAttachmentMetadata(params.attachments),
    externalId: response.id,
    metadata: {
      to: params.to,
      cc: params.cc,
      bcc: params.bcc,
      ...params.metadata,
    },
    sentAt: new Date(),
  });

  return response;
}

function buildAttachmentMetadata(attachments?: EmailSendAttachmentInput[]) {
  if (!attachments?.length) {
    return null;
  }

  return attachments.map((attachment) => ({
    filename: attachment.filename,
    mimeType: attachment.mimeType,
    sizeInBytes: attachment.content ? estimateSize(attachment.content) : undefined,
    bucket: attachment.bucket,
    path: attachment.path,
  }));
}

function estimateSize(content: EmailSendAttachmentInput["content"]) {
  if (typeof content === "string") {
    return Buffer.byteLength(content);
  }
  if (content instanceof Uint8Array) {
    return content.byteLength;
  }
  return 0;
}
