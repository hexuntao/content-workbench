import { DashboardSectionPage } from "@/components/layout/dashboard-section-page";

export default function TopicsPage(): React.JSX.Element {
  return (
    <DashboardSectionPage
      description="Shared routing, layout, and empty-state structure are ready. Thread 3 can now attach list rendering, filters, and actions under this route without reworking the shell."
      eyebrow="Thread 3 / Topics"
      highlights={[
        "Route shell and navigation are stable.",
        "Feature-specific data loading is intentionally not implemented here.",
        "API and domain state logic remain owned by later threads.",
      ]}
      title="Topics workspace"
    />
  );
}
