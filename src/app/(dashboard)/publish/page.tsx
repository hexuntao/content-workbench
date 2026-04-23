import { DashboardSectionPage } from "@/components/layout/dashboard-section-page";

export default function PublishPage(): React.JSX.Element {
  return (
    <DashboardSectionPage
      description="The publish route is available with consistent dashboard framing, ready for export flows and remote-draft surfaces from Thread 5 and Thread 6."
      eyebrow="Thread 5 / Publish"
      highlights={[
        "Layout and navigation are in place.",
        "No publishing workflow assumptions are baked into the UI shell.",
        "This route can accept feature modules without moving shared code again.",
      ]}
      title="Publish workspace"
    />
  );
}
