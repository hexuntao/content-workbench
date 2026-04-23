import { DashboardSectionPage } from "@/components/layout/dashboard-section-page";

export default function ReviewPage(): React.JSX.Element {
  return (
    <DashboardSectionPage
      description="Review gets a dedicated route shell now, while status transitions and queue behavior stay outside Thread 1 ownership."
      eyebrow="Thread 5 / Review"
      highlights={[
        "Shared page scaffolding is already mounted.",
        "No review-task business transitions are implemented here.",
        "Later threads can plug queue and detail views into this shell.",
      ]}
      title="Review workspace"
    />
  );
}
