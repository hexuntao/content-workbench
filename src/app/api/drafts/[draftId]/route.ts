import { NextResponse } from "next/server";

import { createRequestId, toErrorResponse } from "@/features/drafts/server/errors";
import { getDraftWorkbenchDetail } from "@/features/drafts/server/workbench-service";

type DraftRouteContext = {
  params: Promise<{
    draftId: string;
  }>;
};

export async function GET(_request: Request, context: DraftRouteContext): Promise<NextResponse> {
  const requestId = createRequestId();

  try {
    const { draftId } = await context.params;
    const detail = await getDraftWorkbenchDetail(draftId);

    return NextResponse.json(detail);
  } catch (error: unknown) {
    return toErrorResponse(error, requestId);
  }
}
