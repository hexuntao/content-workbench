import { PublishDetailWorkbench } from "@/features/publish/components/publish-detail-workbench";
import { getPublishDetail } from "@/features/publish/server/publish-service";

type PublishDetailPageProps = {
  params: Promise<{
    publishPackageId: string;
  }>;
};

export default async function PublishDetailPage({
  params,
}: PublishDetailPageProps): Promise<React.JSX.Element> {
  const { publishPackageId } = await params;
  const detail = await getPublishDetail(publishPackageId);

  return <PublishDetailWorkbench initialDetail={detail} />;
}
