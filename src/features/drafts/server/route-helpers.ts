import { DraftWorkbenchError } from "@/features/drafts/server/errors";

type JsonRecord = Record<string, unknown>;

function isJsonRecord(value: unknown): value is JsonRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export async function readJsonRecord(request: Request): Promise<JsonRecord> {
  try {
    const body: unknown = await request.json();

    if (!isJsonRecord(body)) {
      throw new DraftWorkbenchError(
        "INVALID_REQUEST_BODY",
        "Request body must be a JSON object.",
        400,
      );
    }

    return body;
  } catch (error: unknown) {
    if (error instanceof DraftWorkbenchError) {
      throw error;
    }

    throw new DraftWorkbenchError("INVALID_REQUEST_BODY", "Request body must be valid JSON.", 400);
  }
}

export function readString(value: unknown): string | null {
  return typeof value === "string" ? value : null;
}

export function readStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.filter((item: unknown): item is string => typeof item === "string");
}
