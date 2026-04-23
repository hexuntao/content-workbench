import type { SourceType } from "@prisma/client";

export interface CollectSourceInput {
  sourceId: string;
  sourceType: SourceType;
  config: Record<string, unknown>;
  requestedAt: string;
}

export interface CollectedSourceItem {
  externalId?: string;
  title: string;
  url: string;
  author?: string;
  publishedAt?: string;
  rawContent?: string;
  summary?: string;
  metadata?: Record<string, unknown>;
}

export interface CollectSourceOutput {
  items: CollectedSourceItem[];
  fetchedCount: number;
}

export interface SourceAdapter {
  collect(input: CollectSourceInput): Promise<CollectSourceOutput>;
}
