import { LoadingView } from "@/components/ui/loading-view";

export default function DashboardLoadingPage(): React.JSX.Element {
  return (
    <LoadingView
      description="Preparing the desk rail, page header, and shared content frame for this section."
      eyebrow="Loading Section"
      title="Opening workspace"
    />
  );
}
