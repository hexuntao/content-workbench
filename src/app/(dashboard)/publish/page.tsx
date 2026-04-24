import { EmptyState } from "@/components/ui/empty-state";
import { PublishBoard } from "@/features/publish/components/publish-board";
import { getPublishBoardSnapshot } from "@/features/publish/server/publish-service";

export const dynamic = "force-dynamic";

export default async function PublishPage(): Promise<React.JSX.Element> {
  const snapshot = await getPublishBoardSnapshot();

  if (snapshot.lanes.every((lane) => lane.items.length === 0)) {
    return (
      <EmptyState
        description="发布面板当前没有可见渠道包。等审核通过后的发布包接入后，这里会显示动作顺序与回填证据。"
        eyebrow="Thread 5 / Publish"
        title="发布准备面板当前为空"
      />
    );
  }

  return <PublishBoard snapshot={snapshot} />;
}
