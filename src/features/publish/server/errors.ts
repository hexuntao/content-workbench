import { NextResponse } from "next/server";

type ErrorDetails = Record<string, string | number | boolean | null | undefined>;

export class PublishWorkbenchError extends Error {
  public readonly code: string;
  public readonly status: number;
  public readonly details: ErrorDetails | undefined;

  public constructor(code: string, message: string, status: number, details?: ErrorDetails) {
    super(message);
    this.name = "PublishWorkbenchError";
    this.code = code;
    this.status = status;
    this.details = details;
  }
}

export function isPublishWorkbenchError(error: unknown): error is PublishWorkbenchError {
  return error instanceof PublishWorkbenchError;
}

export function createRequestId(): string {
  return `req_${crypto.randomUUID()}`;
}

export function toErrorResponse(
  error: unknown,
  requestId: string = createRequestId(),
): NextResponse {
  if (isPublishWorkbenchError(error)) {
    return NextResponse.json(
      {
        error: {
          code: error.code,
          message: error.message,
          details: error.details,
          requestId,
        },
      },
      {
        status: error.status,
      },
    );
  }

  return NextResponse.json(
    {
      error: {
        code: "INTERNAL_SERVER_ERROR",
        message: "Unexpected server error.",
        requestId,
      },
    },
    {
      status: 500,
    },
  );
}

export function invariant(
  condition: boolean,
  code: string,
  message: string,
  status: number,
  details?: ErrorDetails,
): asserts condition {
  if (!condition) {
    throw new PublishWorkbenchError(code, message, status, details);
  }
}
