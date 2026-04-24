import { NextResponse } from "next/server";
import { createRequestId, toErrorResponse } from "@/features/topics/server/errors";
import { readJsonRecord, readString } from "@/features/topics/server/route-helpers";
import { generateMasterDraft } from "@/features/topics/server/topics-service";

type TopicRouteContext = {
  params: Promise<{
    topicId: string;
  }>;
};

export async function POST(request: Request, context: TopicRouteContext): Promise<NextResponse> {
  const requestId = createRequestId();

  try {
    const { topicId } = await context.params;
    const body = await readJsonRecord(request);
    const response = await generateMasterDraft(topicId, {
      voiceProfileId: readString(body.voiceProfileId),
      idempotencyKey: readString(body.idempotencyKey),
    });

    return NextResponse.json(response);
  } catch (error: unknown) {
    return toErrorResponse(error, requestId);
  }
}
