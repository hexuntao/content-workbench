import { PublishWorkbenchError } from "@/features/publish/server/errors";

type JsonRecord = Record<string, unknown>;

function isJsonRecord(value: unknown): value is JsonRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export async function readJsonRecord(request: Request): Promise<JsonRecord> {
  try {
    const body: unknown = await request.json();

    if (!isJsonRecord(body)) {
      throw new PublishWorkbenchError(
        "INVALID_REQUEST_BODY",
        "Request body must be a JSON object.",
        400,
      );
    }

    return body;
  } catch (error: unknown) {
    if (error instanceof PublishWorkbenchError) {
      throw error;
    }

    throw new PublishWorkbenchError(
      "INVALID_REQUEST_BODY",
      "Request body must be valid JSON.",
      400,
    );
  }
}

export function readString(value: unknown): string | null {
  return typeof value === "string" ? value : null;
}
