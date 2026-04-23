import { LoadingView } from "@/components/ui/loading-view";

export default function DraftWorkbenchLoading(): React.JSX.Element {
  return (
    <LoadingView
      description="正在整理正文、改写版本和流程控制区。"
      eyebrow="Draft Workbench"
      title="正在展开成稿工作台"
    />
  );
}
