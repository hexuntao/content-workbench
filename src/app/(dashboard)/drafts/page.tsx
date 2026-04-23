import { DashboardSectionPage } from "@/components/layout/dashboard-section-page";

export default function DraftsPage(): React.JSX.Element {
  return (
    <DashboardSectionPage
      description="This shell gives Drafts a stable layout surface for detail pages, rewrite controls, and package previews once Thread 4 lands feature modules."
      eyebrow="Thread 4 / Drafts"
      highlights={[
        "Dashboard chrome is shared across sections.",
        "Placeholder content avoids inventing rewrite or packaging states.",
        "The route is ready for feature-level composition.",
      ]}
      title="Drafts workspace"
    />
  );
}
