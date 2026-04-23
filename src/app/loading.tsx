import { LoadingView } from "@/components/ui/loading-view";

export default function RootLoadingPage(): React.JSX.Element {
  return (
    <LoadingView
      description="Preparing the editorial shell, shared route chrome, and workspace surfaces."
      eyebrow="Loading Shell"
      title="Opening Content Workbench"
    />
  );
}
