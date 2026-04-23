import { SourceType } from "@prisma/client";
import { mockSourceAdapter } from "@/server/adapters/source/mock";
import { rssSourceAdapter } from "@/server/adapters/source/rss";
import type {
  CollectSourceInput,
  CollectSourceOutput,
  SourceAdapter,
} from "@/server/adapters/source/types";

export interface SourceAdapterProvider {
  collect(input: CollectSourceInput): Promise<CollectSourceOutput>;
}

function getConfiguredSourceProvider(): "mock" | "rss" {
  return process.env.CONTENT_WORKBENCH_SOURCE_PROVIDER === "rss" ? "rss" : "mock";
}

function resolveSourceAdapter(sourceType: SourceType): SourceAdapter {
  const provider = getConfiguredSourceProvider();

  if (provider === "rss" && sourceType === SourceType.RSS) {
    return rssSourceAdapter;
  }

  return mockSourceAdapter;
}

export async function collectSource(input: CollectSourceInput): Promise<CollectSourceOutput> {
  return resolveSourceAdapter(input.sourceType).collect(input);
}

export type {
  CollectedSourceItem,
  CollectSourceInput,
  CollectSourceOutput,
  SourceAdapter,
} from "@/server/adapters/source/types";
