import { NextResponse } from "next/server";
import { createRequestId, toErrorResponse } from "@/features/topics/server/errors";
import { shortlistTopic } from "@/features/topics/server/topics-service";

type TopicRouteContext = {
  params: Promise<{
    topicId: string;
  }>;
};

export async function POST(_request: Request, context: TopicRouteContext): Promise<NextResponse> {
  const requestId = createRequestId();

  try {
    const { topicId } = await context.params;
    const response = await shortlistTopic(topicId);

    return NextResponse.json(response);
  } catch (error: unknown) {
    return toErrorResponse(error, requestId);
  }
}
