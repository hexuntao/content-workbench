import { DashboardSectionPage } from "@/components/layout/dashboard-section-page";

export default function SettingsPage(): React.JSX.Element {
  return (
    <DashboardSectionPage
      description="Settings is included as a stable dashboard destination for future environment, channel, or workspace configuration views."
      eyebrow="Shared / Settings"
      highlights={[
        "The route exists to keep navigation structure complete.",
        "No persistence or environment mutation is introduced in Thread 1.",
        "Future settings panels can layer on top of the existing shell.",
      ]}
      title="Settings workspace"
    />
  );
}
