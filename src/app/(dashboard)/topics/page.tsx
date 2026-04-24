import { TopicsWorkbench } from "@/features/topics/components/topics-workbench";
import {
  getTopicDetail,
  listTopicSourceItems,
  listTopics,
} from "@/features/topics/server/topics-service";

export const dynamic = "force-dynamic";

type TopicsPageProps = {
  searchParams?: Promise<{
    topic?: string;
  }>;
};

export default async function TopicsPage({
  searchParams,
}: TopicsPageProps): Promise<React.JSX.Element> {
  const resolvedSearchParams = searchParams ? await searchParams : {};
  const list = await listTopics({
    sortBy: "totalScore",
  });
  const selectedTopicId = resolvedSearchParams.topic ?? list.items[0]?.id ?? null;
  const detail = selectedTopicId ? await getTopicDetail(selectedTopicId) : null;
  const sourceItems = selectedTopicId
    ? await listTopicSourceItems(selectedTopicId)
    : {
        items: [],
      };

  return (
    <TopicsWorkbench initialDetail={detail} initialList={list} initialSourceItems={sourceItems} />
  );
}
