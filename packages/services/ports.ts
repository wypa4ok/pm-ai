export type Channel = "email" | "whatsapp";

export interface EmailListOptions {
  label?: string;
  maxResults?: number;
  after?: Date;
}

export interface EmailAttachment {
  id?: string;
  filename: string;
  mimeType: string;
  sizeInBytes: number;
  data?: Buffer | Uint8Array | string;
}

export interface EmailMessage {
  id: string;
  threadId: string;
  subject: string;
  snippet?: string;
  from: string;
  to: string[];
  cc: string[];
  bcc: string[];
  bodyText?: string;
  bodyHtml?: string;
  receivedAt: Date;
  attachments: EmailAttachment[];
  raw?: string;
}

export interface EmailSendAttachmentInput {
  filename: string;
  mimeType: string;
  content?: Buffer | Uint8Array | string;
  path?: string;
  bucket?: string;
}

export interface EmailSendRequest {
  to: string[];
  cc?: string[];
  bcc?: string[];
  subject: string;
  text?: string;
  html?: string;
  attachments?: EmailSendAttachmentInput[];
  threadId?: string;
  replyTo?: string;
}

export interface EmailSendResponse {
  id: string;
  threadId: string;
}

export interface EmailClient {
  listInbound(options: EmailListOptions): Promise<EmailMessage[]>;
  getMessage(id: string): Promise<EmailMessage | null>;
  send(request: EmailSendRequest): Promise<EmailSendResponse>;
  markAsProcessed(id: string): Promise<void>;
}

export type WhatsAppMessageType =
  | "text"
  | "image"
  | "audio"
  | "video"
  | "document";

export interface WhatsAppInboundMessage {
  id: string;
  from: string;
  to: string;
  timestamp: Date;
  type: WhatsAppMessageType;
  text?: string;
  mediaUrl?: string;
  mediaMimeType?: string;
  mediaId?: string;
}

export interface WhatsAppWebhookSignature {
  signature: string;
  payload: string;
}

export interface WhatsAppClient {
  verifyToken(token: string): boolean;
  parseWebhookPayload(payload: unknown): Promise<WhatsAppInboundMessage[]>;
  validateSignature(signature: WhatsAppWebhookSignature): Promise<boolean>;
}

export interface ContractorSearchCriteria {
  category: string;
  keywords?: string[];
  postalCode?: string;
  latitude?: number;
  longitude?: number;
  radiusMiles?: number;
}

export interface ContractorProfile {
  id: string;
  name: string;
  phone: string;
  email?: string;
  website?: string;
  rating?: number;
  reviewCount?: number;
  specialties?: string[];
  address?: string;
}

export interface ContractorSearch {
  search(criteria: ContractorSearchCriteria): Promise<ContractorProfile[]>;
}

export interface StoragePutParams {
  bucket?: string;
  path: string;
  contentType: string;
  body: Buffer | Uint8Array | string;
  cacheControl?: string;
}

export interface StoragePutResult {
  signedUrl: string;
  expiresAt: Date;
}

export interface StorageSignedUploadResult {
  signedUrl: string;
  token: string;
  expiresAt: Date;
  path: string;
  bucket: string;
}

export interface Storage {
  putObject(params: StoragePutParams): Promise<StoragePutResult>;
  getSignedUrl(
    bucket: string,
    path: string,
    expiresInSeconds: number,
  ): Promise<string>;
  removeObject(bucket: string, path: string): Promise<void>;
  createSignedUploadUrl(params: {
    bucket?: string;
    path: string;
    expiresInSeconds?: number;
  }): Promise<StorageSignedUploadResult>;
}

export type ConversationRole = "system" | "assistant" | "user";

export interface ConversationMessage {
  id: string;
  role: ConversationRole;
  body: string;
  timestamp: Date;
  channel: Channel;
}

export interface TriageRequest {
  ticketId: string;
  subject: string;
  body: string;
  channel: Channel;
}

export interface TriageResult {
  summary: string;
  category: string;
  urgency: "low" | "medium" | "high";
  confidence: number;
}

export interface DraftReplyRequest {
  ticketId: string;
  conversation: ConversationMessage[];
  instructions?: string;
}

export interface DraftReplyResult {
  draft: string;
  rationale?: string;
  tokens: {
    prompt: number;
    completion: number;
    total: number;
  };
}

export interface AIClient {
  triage(request: TriageRequest): Promise<TriageResult>;
  draftReply(request: DraftReplyRequest): Promise<DraftReplyResult>;
}
