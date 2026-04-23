import { EmptyState } from "@/components/ui/empty-state";
import { ReviewQueueBoard } from "@/features/review/components/review-queue-board";
import { getReviewQueueSnapshot } from "@/features/review/server/review-service";

export default async function ReviewPage(): Promise<React.JSX.Element> {
  const snapshot = await getReviewQueueSnapshot();

  if (snapshot.lanes.every((lane) => lane.items.length === 0)) {
    return (
      <EmptyState
        description="审核队列当前没有任务。等打包稿件进入 review 后，这里会按待判、修订返回和已放行上下文分区显示。"
        eyebrow="Thread 5 / Review"
        title="审核决策台当前为空"
      />
    );
  }

  return <ReviewQueueBoard snapshot={snapshot} />;
}
