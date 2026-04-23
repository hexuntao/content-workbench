import { notFound } from "next/navigation";

import { DraftWorkbench } from "@/features/drafts/components/draft-workbench";
import { DraftWorkbenchError } from "@/features/drafts/server/errors";
import {
  getDraftDirectoryItems,
  getDraftWorkbenchDetail,
} from "@/features/drafts/server/workbench-service";

type DraftWorkbenchPageProps = {
  params: Promise<{
    draftId: string;
  }>;
};

export default async function DraftWorkbenchPage({
  params,
}: DraftWorkbenchPageProps): Promise<React.JSX.Element> {
  const { draftId } = await params;

  try {
    const [detail, relatedDrafts] = await Promise.all([
      getDraftWorkbenchDetail(draftId),
      getDraftDirectoryItems(),
    ]);

    return (
      <DraftWorkbench draftId={draftId} initialDetail={detail} relatedDrafts={relatedDrafts} />
    );
  } catch (error: unknown) {
    if (error instanceof DraftWorkbenchError && error.code === "DRAFT_NOT_FOUND") {
      notFound();
    }

    throw error;
  }
}
