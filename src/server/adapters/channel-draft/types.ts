import type { ChannelType } from "@prisma/client";

export interface CreateRemoteDraftInput {
  channel: Extract<ChannelType, "WECHAT" | "X_ARTICLE">;
  title: string;
  summary?: string;
  content: string;
  assets?: Array<{
    path: string;
    mimeType?: string;
  }>;
  accountId?: string;
}

export interface CreateRemoteDraftOutput {
  draftUrl: string;
  remoteId?: string;
  metadata?: Record<string, unknown>;
}

export interface ChannelDraftAdapter {
  createRemoteDraft(input: CreateRemoteDraftInput): Promise<CreateRemoteDraftOutput>;
}
