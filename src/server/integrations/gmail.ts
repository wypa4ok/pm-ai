import { MessageChannel, MessageDirection } from "@prisma/client";
import { GmailEmailClient } from "../../../packages/adapters/email/gmail-adapter";
import type { EmailMessage } from "../../../packages/services/ports";
import { prisma, logMessage } from "../db";
import { getStorage } from "../storage";

export interface GmailIngestOptions {
  label?: string;
  maxMessages?: number;
}

export interface GmailIngestResult {
  processed: number;
  skipped: number;
  errors: Array<{ messageId?: string; error: string }>;
}

export async function ingestGmail(
  options: GmailIngestOptions = {},
): Promise<GmailIngestResult> {
  console.log("env snapshot", process.env);
  const client = createGmailClient();

  const messages = await client.listInbound({
    label: options.label ?? process.env.GMAIL_LABEL,
    maxResults: options.maxMessages ?? 10,
  });

  const ownerUserId = requireEnv("GMAIL_DEFAULT_OWNER_USER_ID");

  const result: GmailIngestResult = {
    processed: 0,
    skipped: 0,
    errors: [],
  };

  for (const message of messages) {
    try {
      const persisted = await persistMessage(message, ownerUserId);
      if (persisted) {
        await client.markAsProcessed(message.id);
        result.processed += 1;
      } else {
        result.skipped += 1;
      }
    } catch (error) {
      console.error("Failed to ingest Gmail message", {
        messageId: message.id,
        error,
      });
      result.errors.push({
        messageId: message.id,
        error: (error as Error).message ?? "Unknown error",
      });
    }
  }

  return result;
}

async function persistMessage(
  message: EmailMessage,
  ownerUserId: string,
): Promise<boolean> {
  const existing = await prisma.message.findFirst({
    where: { externalId: message.id },
  });

  if (existing) {
    return false;
  }

  const ticket = await prisma.ticket.findFirst({
    where: { sourceId: message.threadId },
  });

  const ticketId =
    ticket?.id ??
    (
      await prisma.ticket.create({
        data: {
          subject: message.subject,
          description: message.snippet ?? message.bodyText ?? null,
          ownerUserId,
          channel: MessageChannel.EMAIL,
          sourceId: message.threadId,
        },
      })
    ).id;

  const uploadedAttachments = await uploadAttachments(ticketId, message.attachments);

  await logMessage(
    {
      ticketId,
      ownerUserId,
      direction: MessageDirection.INBOUND,
      channel: MessageChannel.EMAIL,
      subject: message.subject,
      bodyText: message.bodyText ?? message.snippet ?? null,
      bodyHtml: message.bodyHtml,
      attachments: uploadedAttachments,
      externalId: message.id,
      metadata: {
        from: message.from,
        to: message.to,
        cc: message.cc,
        bcc: message.bcc,
      },
      sentAt: message.receivedAt,
    },
    prisma,
  );

  return true;
}

async function uploadAttachments(
  ticketId: string,
  attachments: EmailMessage["attachments"],
) {
  if (!attachments?.length) {
    return [];
  }

  const storage = getStorage();
  const uploaded = await Promise.all(
    attachments.map(async (attachment) => {
      const path = `tickets/${ticketId}/${Date.now()}-${attachment.filename}`;
      const { signedUrl, expiresAt } = await storage.putObject({
        path,
        body: attachment.data ?? Buffer.alloc(0),
        contentType: attachment.mimeType,
        cacheControl: "3600",
      });

      return {
        id: attachment.id,
        filename: attachment.filename,
        mimeType: attachment.mimeType,
        sizeInBytes: attachment.sizeInBytes,
        url: signedUrl,
        expiresAt: expiresAt.toISOString(),
        storagePath: path,
      };
    }),
  );

  return uploaded;
}

export function createGmailClient(): GmailEmailClient {
  return new GmailEmailClient({
    clientId: requireEnv("GOOGLE_CLIENT_ID"),
    clientSecret: requireEnv("GOOGLE_CLIENT_SECRET"),
    redirectUri: requireEnv("GMAIL_REDIRECT_URI"),
    refreshToken: requireEnv("GMAIL_REFRESH_TOKEN"),
    fromAddress: requireEnv("GMAIL_FROM_ADDRESS"),
    inboxLabel: process.env.GMAIL_LABEL ?? "PM/Inbound",
    processedLabel: process.env.GMAIL_PROCESSED_LABEL ?? "PM/Processed",
  });
}

export function requireEnv(key: string): string {
  const value = process.env[key];
  if (!value) {
    throw new Error(`Missing environment variable ${key}`);
  }
  return value;
}
