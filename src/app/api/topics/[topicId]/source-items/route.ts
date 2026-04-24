import { NextResponse } from "next/server";
import { createRequestId, toErrorResponse } from "@/features/topics/server/errors";
import { listTopicSourceItems } from "@/features/topics/server/topics-service";

type TopicRouteContext = {
  params: Promise<{
    topicId: string;
  }>;
};

export async function GET(_request: Request, context: TopicRouteContext): Promise<NextResponse> {
  const requestId = createRequestId();

  try {
    const { topicId } = await context.params;
    const items = await listTopicSourceItems(topicId);

    return NextResponse.json(items);
  } catch (error: unknown) {
    return toErrorResponse(error, requestId);
  }
}
