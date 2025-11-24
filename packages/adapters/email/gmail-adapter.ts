import { google, gmail_v1 } from "googleapis";
// MailComposer does not ship types in Nodemailer, fall back to any
// eslint-disable-next-line @typescript-eslint/no-var-requires
const MailComposer: any = require("nodemailer/lib/mail-composer");
import type {
  EmailAttachment,
  EmailClient,
  EmailListOptions,
  EmailMessage,
  EmailSendRequest,
  EmailSendResponse,
} from "../../services/ports";

export interface GmailEmailClientOptions {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
  refreshToken: string;
  fromAddress: string;
  userId?: string;
  inboxLabel?: string;
  processedLabel?: string;
}

export class GmailEmailClient implements EmailClient {
  private readonly userId: string;
  private gmailClient?: gmail_v1.Gmail;
  private readonly labelCache = new Map<string, string>();

  constructor(private readonly options: GmailEmailClientOptions) {
    this.userId = options.userId ?? "me";
    console.log("GmailEmailClient initialized for userId:", this.userId);
    console.log("Refresh token:", this.options.refreshToken);
    console.log("Client ID:", this.options.clientId);
    console.log("Client Secret:", this.options.clientSecret);
  }

  async listInbound(options: EmailListOptions = {}): Promise<EmailMessage[]> {
    const gmail = await this.getGmailClient();
    const labelId = await this.resolveLabelId(
      options.label ?? this.options.inboxLabel,
    );

    const queryParts: string[] = [];
    if (options.after) {
      queryParts.push(`after:${Math.floor(options.after.getTime() / 1000)}`);
    }

    const response = await gmail.users.messages.list({
      userId: this.userId,
      labelIds: labelId ? [labelId] : undefined,
      maxResults: options.maxResults ?? 10,
      q: queryParts.length ? queryParts.join(" ") : undefined,
    });

    const messages = response.data.messages ?? [];
    if (!messages.length) {
      return [];
    }

    const detailedMessages = await Promise.all(
      messages.map(async (message) => {
        if (!message.id) return null;
        return this.getMessage(message.id);
      }),
    );

    return detailedMessages.filter(
      (message): message is EmailMessage => message !== null,
    );
  }

  async getMessage(id: string): Promise<EmailMessage | null> {
    const gmail = await this.getGmailClient();
    const response = await gmail.users.messages.get({
      userId: this.userId,
      id,
    });

    if (!response.data) {
      return null;
    }

    return this.toEmailMessage(response.data);
  }

  async send(request: EmailSendRequest): Promise<EmailSendResponse> {
    const gmail = await this.getGmailClient();
    const messageBuffer = await this.buildMimeMessage(request);
    const raw = this.toBase64Url(messageBuffer);

    const response = await gmail.users.messages.send({
      userId: this.userId,
      requestBody: {
        raw,
        threadId: request.threadId,
      },
    });

    return {
      id: response.data.id ?? "",
      threadId: response.data.threadId ?? "",
    };
  }

  async markAsProcessed(id: string): Promise<void> {
    const gmail = await this.getGmailClient();
    const inboxLabelId = await this.resolveLabelId(this.options.inboxLabel);
    const processedLabelId = await this.ensureLabel(
      this.options.processedLabel ?? "PM/Processed",
    );

    await gmail.users.messages.modify({
      userId: this.userId,
      id,
      requestBody: {
        removeLabelIds: inboxLabelId ? [inboxLabelId] : undefined,
        addLabelIds: processedLabelId ? [processedLabelId] : undefined,
      },
    });
  }

  private async getGmailClient(): Promise<gmail_v1.Gmail> {
    if (this.gmailClient) {
      return this.gmailClient;
    }

    const oAuth2Client = new google.auth.OAuth2(
      this.options.clientId,
      this.options.clientSecret,
      this.options.redirectUri,
    );

    oAuth2Client.setCredentials({
      refresh_token: this.options.refreshToken,
    });

    this.gmailClient = google.gmail({
      version: "v1",
      auth: oAuth2Client,
    });

    return this.gmailClient;
  }

  private async resolveLabelId(label?: string | null): Promise<string | undefined> {
    if (!label) {
      return undefined;
    }

    if (this.labelCache.has(label)) {
      return this.labelCache.get(label);
    }

    const gmail = await this.getGmailClient();
    const response = await gmail.users.labels.list({
      userId: this.userId,
    });

    for (const item of response.data.labels ?? []) {
      if (item.name === label || item.id === label) {
        if (item.name) {
          this.labelCache.set(item.name, item.id ?? item.name);
        }
        if (item.id) {
          this.labelCache.set(item.id, item.id);
        }
        return item.id ?? item.name ?? undefined;
      }
    }

    return undefined;
  }

  private async ensureLabel(labelName: string): Promise<string | undefined> {
    const existing = await this.resolveLabelId(labelName);
    if (existing) return existing;

    const gmail = await this.getGmailClient();
    const response = await gmail.users.labels.create({
      userId: this.userId,
      requestBody: {
        name: labelName,
      },
    });

    const labelId = response.data.id ?? labelName;
    this.labelCache.set(labelName, labelId);
    return labelId;
  }

  private async toEmailMessage(
    message: gmail_v1.Schema$Message,
  ): Promise<EmailMessage> {
    const headers = this.extractHeaders(message.payload?.headers);
    const { textBody, htmlBody } = this.extractBodies(message.payload);
    const attachments = await this.extractAttachments(message);

    return {
      id: message.id ?? "",
      threadId: message.threadId ?? "",
      subject: headers.subject ?? "(no subject)",
      snippet: message.snippet ?? undefined,
      from: headers.from ?? "",
      to: headers.to ? headers.to.split(",").map((value) => value.trim()) : [],
      cc: headers.cc ? headers.cc.split(",").map((value) => value.trim()) : [],
      bcc: headers.bcc
        ? headers.bcc.split(",").map((value) => value.trim())
        : [],
      bodyText: textBody ?? undefined,
      bodyHtml: htmlBody ?? undefined,
      receivedAt: message.internalDate
        ? new Date(Number(message.internalDate))
        : new Date(),
      attachments,
      raw: message.raw ?? undefined,
    };
  }

  private extractHeaders(
    headers: gmail_v1.Schema$MessagePartHeader[] | undefined,
  ): Record<string, string> {
    const map: Record<string, string> = {};
    for (const header of headers ?? []) {
      if (!header.name || header.value == null) continue;
      map[header.name.toLowerCase()] = header.value;
    }
    return map;
  }

  private extractBodies(payload?: gmail_v1.Schema$MessagePart) {
    const result: { textBody?: string; htmlBody?: string } = {};

    const walk = (part?: gmail_v1.Schema$MessagePart) => {
      if (!part) return;
      const mimeType = part.mimeType ?? "";
      if (mimeType === "text/plain" && part.body?.data) {
        result.textBody = this.decodeBase64(part.body.data);
      } else if (mimeType === "text/html" && part.body?.data) {
        result.htmlBody = this.decodeBase64(part.body.data);
      } else if (part.parts?.length) {
        for (const child of part.parts) {
          walk(child);
        }
      } else if (part.body?.data && !result.textBody) {
        result.textBody = this.decodeBase64(part.body.data);
      }
    };

    walk(payload);
    return result;
  }

  private async extractAttachments(
    message: gmail_v1.Schema$Message,
  ): Promise<EmailAttachment[]> {
    const gmail = await this.getGmailClient();
    const attachments: EmailAttachment[] = [];

    const collect = async (part?: gmail_v1.Schema$MessagePart) => {
      if (!part) return;
      const filename = part.filename;
      const attachmentId = part.body?.attachmentId;

      if (filename && attachmentId) {
        const attachment = await gmail.users.messages.attachments.get({
          userId: this.userId,
          messageId: message.id ?? "",
          id: attachmentId,
        });

        const data = attachment.data.data
          ? this.decodeBase64ToBuffer(attachment.data.data)
          : Buffer.alloc(0);

        attachments.push({
          id: attachmentId,
          filename,
          mimeType: part.mimeType ?? "application/octet-stream",
          sizeInBytes: data.length,
          data,
        });
      }

      for (const child of part?.parts ?? []) {
        await collect(child);
      }
    };

    await collect(message.payload);
    return attachments;
  }

  private async buildMimeMessage(request: EmailSendRequest): Promise<Buffer> {
    const mail = new MailComposer({
      from: this.options.fromAddress,
      to: request.to.join(", "),
      cc: request.cc?.length ? request.cc.join(", ") : undefined,
      bcc: request.bcc?.length ? request.bcc.join(", ") : undefined,
      subject: request.subject,
      text: request.text,
      html: request.html,
      headers: {
        "Reply-To": request.replyTo,
      },
      attachments: request.attachments?.map((attachment) => ({
        filename: attachment.filename,
        content: attachment.content,
        contentType: attachment.mimeType,
      })),
    });

    return new Promise<Buffer>((resolve, reject) => {
      mail.compile().build((error: Error | null, message: Buffer) => {
        if (error) {
          reject(error);
          return;
        }
        if (!message) {
          reject(new Error("Failed to build Gmail MIME message"));
          return;
        }
        resolve(message);
      });
    });
  }

  private decodeBase64(data: string): string {
    return Buffer.from(data.replace(/-/g, "+").replace(/_/g, "/"), "base64")
      .toString("utf8")
      .trim();
  }

  private decodeBase64ToBuffer(data: string): Buffer {
    return Buffer.from(data.replace(/-/g, "+").replace(/_/g, "/"), "base64");
  }

  private toBase64Url(buffer: Buffer): string {
    return buffer
      .toString("base64")
      .replace(/\+/g, "-")
      .replace(/\//g, "_")
      .replace(/=+$/, "");
  }
}
