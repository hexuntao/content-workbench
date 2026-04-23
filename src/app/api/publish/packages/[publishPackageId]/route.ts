import { NextResponse } from "next/server";

import { createRequestId, toErrorResponse } from "@/features/publish/server/errors";
import { getPublishDetail } from "@/features/publish/server/publish-service";

type PublishRouteContext = {
  params: Promise<{
    publishPackageId: string;
  }>;
};

export async function GET(_request: Request, context: PublishRouteContext): Promise<NextResponse> {
  const requestId = createRequestId();

  try {
    const { publishPackageId } = await context.params;
    const detail = await getPublishDetail(publishPackageId);

    return NextResponse.json(detail);
  } catch (error: unknown) {
    return toErrorResponse(error, requestId);
  }
}
