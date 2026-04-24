import { NextResponse } from "next/server";

import { createRequestId, toErrorResponse } from "@/features/drafts/server/errors";
import {
  readJsonRecord,
  readString,
  readStringArray,
} from "@/features/drafts/server/route-helpers";
import { listDraftRewrites, triggerRewriteJob } from "@/features/drafts/server/workbench-service";

type DraftRouteContext = {
  params: Promise<{
    draftId: string;
  }>;
};

export async function GET(_request: Request, context: DraftRouteContext): Promise<NextResponse> {
  const requestId = createRequestId();

  try {
    const { draftId } = await context.params;
    const response = await listDraftRewrites(draftId);

    return NextResponse.json(response);
  } catch (error: unknown) {
    return toErrorResponse(error, requestId);
  }
}

export async function POST(request: Request, context: DraftRouteContext): Promise<NextResponse> {
  const requestId = createRequestId();

  try {
    const { draftId } = await context.params;
    const body = await readJsonRecord(request);
    const response = await triggerRewriteJob(draftId, {
      strategies: readStringArray(body.strategies),
      voiceProfileId: readString(body.voiceProfileId),
    });

    return NextResponse.json(response);
  } catch (error: unknown) {
    return toErrorResponse(error, requestId);
  }
}
