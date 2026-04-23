import { ReviewWorkbenchError } from "@/features/review/server/errors";

type JsonRecord = Record<string, unknown>;

function isJsonRecord(value: unknown): value is JsonRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export async function readJsonRecord(request: Request): Promise<JsonRecord> {
  try {
    const body: unknown = await request.json();

    if (!isJsonRecord(body)) {
      throw new ReviewWorkbenchError(
        "INVALID_REQUEST_BODY",
        "Request body must be a JSON object.",
        400,
      );
    }

    return body;
  } catch (error: unknown) {
    if (error instanceof ReviewWorkbenchError) {
      throw error;
    }

    throw new ReviewWorkbenchError("INVALID_REQUEST_BODY", "Request body must be valid JSON.", 400);
  }
}

export function readString(value: unknown): string | null {
  return typeof value === "string" ? value : null;
}

export function readBoolean(value: unknown): boolean | null {
  return typeof value === "boolean" ? value : null;
}

export function readIntegerParam(value: string | null, fallback: number): number {
  if (value === null) {
    return fallback;
  }

  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}
