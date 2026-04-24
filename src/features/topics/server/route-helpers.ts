import { TopicStatus } from "@prisma/client";
import { TopicsError } from "@/features/topics/server/errors";

type JsonRecord = Record<string, unknown>;

function isJsonRecord(value: unknown): value is JsonRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function readPositiveInteger(value: string | null, fallback: number): number {
  if (value === null || value.length === 0) {
    return fallback;
  }

  const parsed = Number.parseInt(value, 10);

  if (!Number.isFinite(parsed) || parsed < 1) {
    throw new TopicsError(
      "INVALID_QUERY_PARAMS",
      "Query parameter must be a positive integer.",
      400,
      {
        value,
      },
    );
  }

  return parsed;
}

export async function readJsonRecord(request: Request): Promise<JsonRecord> {
  try {
    const body: unknown = await request.json();

    if (!isJsonRecord(body)) {
      throw new TopicsError("INVALID_REQUEST_BODY", "Request body must be a JSON object.", 400);
    }

    return body;
  } catch (error: unknown) {
    if (error instanceof TopicsError) {
      throw error;
    }

    throw new TopicsError("INVALID_REQUEST_BODY", "Request body must be valid JSON.", 400);
  }
}

export function readString(value: unknown): string | null {
  return typeof value === "string" ? value : null;
}

export function readTopicStatus(value: string | null): TopicStatus | undefined {
  if (value === null || value.length === 0) {
    return undefined;
  }

  if (Object.values(TopicStatus).includes(value as TopicStatus)) {
    return value as TopicStatus;
  }

  throw new TopicsError("INVALID_QUERY_PARAMS", "Invalid topic status query parameter.", 400, {
    status: value,
  });
}

export function readTopicSort(
  value: string | null,
): "createdAt" | "totalScore" | "updatedAt" | undefined {
  if (value === null || value.length === 0) {
    return undefined;
  }

  if (value === "createdAt" || value === "totalScore" || value === "updatedAt") {
    return value;
  }

  throw new TopicsError("INVALID_QUERY_PARAMS", "Invalid topic sort query parameter.", 400, {
    sortBy: value,
  });
}

export function readPagination(searchParams: URLSearchParams): {
  page: number;
  pageSize: number;
} {
  return {
    page: readPositiveInteger(searchParams.get("page"), 1),
    pageSize: readPositiveInteger(searchParams.get("pageSize"), 20),
  };
}
