import { NextResponse } from "next/server";

import { createRequestId, toErrorResponse } from "@/features/publish/server/errors";
import { markPackagePublished } from "@/features/publish/server/publish-service";
import { readJsonRecord, readString } from "@/features/publish/server/route-helpers";

type PublishRouteContext = {
  params: Promise<{
    publishPackageId: string;
  }>;
};

export async function POST(request: Request, context: PublishRouteContext): Promise<NextResponse> {
  const requestId = createRequestId();

  try {
    const { publishPackageId } = await context.params;
    const body = await readJsonRecord(request);
    const detail = await markPackagePublished(publishPackageId, {
      publishedUrl: readString(body.publishedUrl) ?? "",
      publishedAt: readString(body.publishedAt) ?? new Date().toISOString(),
      notes: readString(body.notes),
    });

    return NextResponse.json(detail);
  } catch (error: unknown) {
    return toErrorResponse(error, requestId);
  }
}
