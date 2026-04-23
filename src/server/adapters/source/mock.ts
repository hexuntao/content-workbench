import type {
  CollectSourceInput,
  CollectSourceOutput,
  SourceAdapter,
} from "@/server/adapters/source/types";

export const mockSourceAdapter: SourceAdapter = {
  async collect(input: CollectSourceInput): Promise<CollectSourceOutput> {
    const items = [
      {
        externalId: `${input.sourceId}-item-1`,
        title: `${input.sourceType} mock signal 1`,
        url: `https://example.com/${input.sourceId}/signal-1`,
        author: "Content Workbench",
        publishedAt: input.requestedAt,
        rawContent: "Mock collected content for workflow integration testing.",
        summary: "Mock summary for the first collected item.",
        metadata: {
          provider: "mock",
        },
      },
      {
        externalId: `${input.sourceId}-item-2`,
        title: `${input.sourceType} mock signal 2`,
        url: `https://example.com/${input.sourceId}/signal-2`,
        publishedAt: input.requestedAt,
        rawContent: "Another mock collected content sample.",
        summary: "Mock summary for the second collected item.",
        metadata: {
          provider: "mock",
        },
      },
    ];

    return {
      items,
      fetchedCount: items.length,
    };
  },
};
