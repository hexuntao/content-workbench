import type {
  CollectSourceInput,
  CollectSourceOutput,
  SourceAdapter,
} from "@/server/adapters/source/types";
import { JobsServiceError } from "@/server/services/jobs/errors";

function readConfigUrl(config: Record<string, unknown>): string {
  const value = config.url;

  if (typeof value !== "string" || value.length === 0) {
    throw new JobsServiceError("INVALID_REQUEST_BODY", "Source config.url is required.", 400);
  }

  return value;
}

function extractTagValue(block: string, tagName: string): string | undefined {
  const regexp = new RegExp(`<${tagName}>([\\s\\S]*?)<\\/${tagName}>`, "i");
  const match = block.match(regexp);

  return match?.[1]?.trim();
}

function stripHtml(value: string): string {
  return value
    .replaceAll(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
    .replaceAll(/<[^>]+>/g, " ")
    .replaceAll(/\s+/g, " ")
    .trim();
}

function collectItemBlocks(xml: string): string[] {
  const rssItems = [...xml.matchAll(/<item>([\s\S]*?)<\/item>/gi)].map(
    (match: RegExpMatchArray) => match[1] ?? "",
  );

  if (rssItems.length > 0) {
    return rssItems;
  }

  return [...xml.matchAll(/<entry>([\s\S]*?)<\/entry>/gi)].map(
    (match: RegExpMatchArray) => match[1] ?? "",
  );
}

export const rssSourceAdapter: SourceAdapter = {
  async collect(input: CollectSourceInput): Promise<CollectSourceOutput> {
    const url = readConfigUrl(input.config);

    let response: Response;

    try {
      response = await fetch(url, {
        headers: {
          Accept: "application/rss+xml, application/atom+xml, application/xml, text/xml",
        },
      });
    } catch {
      throw new JobsServiceError("SOURCE_FETCH_FAILED", "Failed to fetch source feed.", 502, {
        sourceId: input.sourceId,
        sourceType: input.sourceType,
      });
    }

    if (response.status === 401 || response.status === 403) {
      throw new JobsServiceError("SOURCE_FETCH_FAILED", "Source authentication failed.", 502, {
        sourceId: input.sourceId,
        sourceType: input.sourceType,
        upstreamStatus: response.status,
      });
    }

    if (response.status === 429) {
      throw new JobsServiceError("SOURCE_FETCH_FAILED", "Source rate limited the request.", 503, {
        sourceId: input.sourceId,
        sourceType: input.sourceType,
        upstreamStatus: response.status,
      });
    }

    if (!response.ok) {
      throw new JobsServiceError(
        "SOURCE_FETCH_FAILED",
        "Source returned an unexpected response.",
        502,
        {
          sourceId: input.sourceId,
          sourceType: input.sourceType,
          upstreamStatus: response.status,
        },
      );
    }

    const xml = await response.text();
    const itemBlocks = collectItemBlocks(xml);

    if (itemBlocks.length === 0) {
      throw new JobsServiceError("SOURCE_FETCH_FAILED", "No feed items could be parsed.", 502, {
        sourceId: input.sourceId,
        sourceType: input.sourceType,
      });
    }

    const items = itemBlocks
      .map((block: string) => {
        const title = extractTagValue(block, "title");
        const rawLink = extractTagValue(block, "link");
        const link =
          rawLink?.startsWith("http") === true
            ? rawLink
            : block.match(/<link[^>]*href="([^"]+)"/i)?.[1];

        if (!title || !link) {
          return null;
        }

        const description =
          extractTagValue(block, "description") ?? extractTagValue(block, "summary") ?? "";
        const publishedAt =
          extractTagValue(block, "pubDate") ?? extractTagValue(block, "published") ?? undefined;

        return {
          externalId: extractTagValue(block, "guid") ?? extractTagValue(block, "id"),
          title: stripHtml(title),
          url: link.trim(),
          author: stripHtml(
            extractTagValue(block, "author") ?? extractTagValue(block, "dc:creator") ?? "",
          ),
          publishedAt,
          rawContent: stripHtml(description),
          summary: stripHtml(description).slice(0, 280),
          metadata: {
            provider: "rss",
          },
        };
      })
      .filter((item): item is NonNullable<typeof item> => item !== null);

    return {
      items,
      fetchedCount: items.length,
    };
  },
};
