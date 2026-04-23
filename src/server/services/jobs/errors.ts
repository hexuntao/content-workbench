import { NextResponse } from "next/server";

type ErrorDetailValue =
  | string
  | number
  | boolean
  | null
  | ErrorDetailValue[]
  | {
      [key: string]: ErrorDetailValue;
    };

export type ErrorDetails = Record<string, ErrorDetailValue>;

export interface ApiErrorBody {
  error: {
    code: string;
    message: string;
    details?: ErrorDetails;
    requestId: string;
  };
}

export class JobsServiceError extends Error {
  readonly code: string;
  readonly status: number;
  readonly details?: ErrorDetails;

  constructor(code: string, message: string, status: number, details?: ErrorDetails) {
    super(message);
    this.name = "JobsServiceError";
    this.code = code;
    this.status = status;
    this.details = details;
  }
}

export function createRequestId(): string {
  return `req_${crypto.randomUUID()}`;
}

export function toApiErrorBody(
  error: unknown,
  requestId: string,
): {
  body: ApiErrorBody;
  status: number;
} {
  if (error instanceof JobsServiceError) {
    return {
      body: {
        error: {
          code: error.code,
          message: error.message,
          details: error.details,
          requestId,
        },
      },
      status: error.status,
    };
  }

  return {
    body: {
      error: {
        code: "INTERNAL_SERVER_ERROR",
        message: "An unexpected error occurred.",
        requestId,
      },
    },
    status: 500,
  };
}

export function toErrorResponse(error: unknown, requestId: string): NextResponse<ApiErrorBody> {
  const response = toApiErrorBody(error, requestId);
  return NextResponse.json(response.body, {
    status: response.status,
  });
}
