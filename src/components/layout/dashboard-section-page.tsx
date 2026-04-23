import { EmptyState } from "@/components/ui/empty-state";

type DashboardSectionPageProps = {
  eyebrow: string;
  title: string;
  description: string;
  highlights: string[];
};

export function DashboardSectionPage({
  eyebrow,
  title,
  description,
  highlights,
}: DashboardSectionPageProps): React.JSX.Element {
  return (
    <div className="page-stack">
      <section className="section-card">
        <div className="section-heading">
          <p className="eyebrow">{eyebrow}</p>
          <h2>{title}</h2>
          <p>{description}</p>
        </div>

        <ul className="highlight-list">
          {highlights.map((highlight) => (
            <li key={highlight}>{highlight}</li>
          ))}
        </ul>
      </section>

      <EmptyState
        description="Feature modules, data loading, and route-specific actions should be added by the owning thread without changing the shared shell contract."
        eyebrow="Ready for downstream work"
        title="This route is intentionally empty"
      />
    </div>
  );
}
