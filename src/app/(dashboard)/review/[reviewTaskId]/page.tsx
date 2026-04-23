import { ReviewDetailWorkbench } from "@/features/review/components/review-detail-workbench";
import { getReviewDetail } from "@/features/review/server/review-service";

type ReviewDetailPageProps = {
  params: Promise<{
    reviewTaskId: string;
  }>;
};

export default async function ReviewDetailPage({
  params,
}: ReviewDetailPageProps): Promise<React.JSX.Element> {
  const { reviewTaskId } = await params;
  const detail = await getReviewDetail(reviewTaskId);

  return <ReviewDetailWorkbench initialDetail={detail} />;
}
