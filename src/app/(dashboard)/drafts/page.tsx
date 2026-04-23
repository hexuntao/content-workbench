import { DraftDirectory } from "@/features/drafts/components/draft-directory";
import {
  getDefaultDraftId,
  getDraftDirectoryItems,
} from "@/features/drafts/server/workbench-service";

export default async function DraftsPage(): Promise<React.JSX.Element> {
  const [drafts, featuredDraftId] = await Promise.all([
    getDraftDirectoryItems(),
    getDefaultDraftId(),
  ]);

  return <DraftDirectory drafts={drafts} featuredDraftId={featuredDraftId} />;
}
