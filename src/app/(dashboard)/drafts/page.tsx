import { DraftDirectory } from "@/features/drafts/components/draft-directory";
import { getDraftDirectoryItems } from "@/features/drafts/server/workbench-service";

export default async function DraftsPage(): Promise<React.JSX.Element> {
  const drafts = await getDraftDirectoryItems();
  const featuredDraftId = drafts[0]?.id ?? null;

  return <DraftDirectory drafts={drafts} featuredDraftId={featuredDraftId} />;
}
