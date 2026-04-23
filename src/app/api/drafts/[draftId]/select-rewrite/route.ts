import { NextResponse } from "next/server";

import { createRequestId, toErrorResponse } from "@/features/drafts/server/errors";
import { readJsonRecord, readString } from "@/features/drafts/server/route-helpers";
import { selectRewriteVersion } from "@/features/drafts/server/workbench-service";

type DraftRouteContext = {
  params: Promise<{
    draftId: string;
  }>;
};

export async function POST(request: Request, context: DraftRouteContext): Promise<NextResponse> {
  const requestId = createRequestId();

  try {
    const { draftId } = await context.params;
    const body = await readJsonRecord(request);
    const detail = await selectRewriteVersion(draftId, {
      rewriteId: readString(body.rewriteId) ?? "",
    });

    return NextResponse.json(detail);
  } catch (error: unknown) {
    return toErrorResponse(error, requestId);
  }
}
