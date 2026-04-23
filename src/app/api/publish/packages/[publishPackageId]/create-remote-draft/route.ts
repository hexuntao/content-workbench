import { NextResponse } from "next/server";

import { createRequestId, toErrorResponse } from "@/features/publish/server/errors";
import { createRemoteDraftForPackage } from "@/features/publish/server/publish-service";
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
    const response = await createRemoteDraftForPackage(
      publishPackageId,
      readString(body.channelAccountId),
    );

    return NextResponse.json(response);
  } catch (error: unknown) {
    return toErrorResponse(error, requestId);
  }
}
