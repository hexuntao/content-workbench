import { NextResponse } from "next/server";

import { createRequestId, toErrorResponse } from "@/features/publish/server/errors";
import { exportPublishPackage } from "@/features/publish/server/publish-service";

type PublishRouteContext = {
  params: Promise<{
    publishPackageId: string;
  }>;
};

export async function POST(_request: Request, context: PublishRouteContext): Promise<NextResponse> {
  const requestId = createRequestId();

  try {
    const { publishPackageId } = await context.params;
    const response = await exportPublishPackage(publishPackageId);

    return NextResponse.json(response);
  } catch (error: unknown) {
    return toErrorResponse(error, requestId);
  }
}
