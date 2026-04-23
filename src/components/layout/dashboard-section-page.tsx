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
      <section className="section-stage">
        <div className="section-heading">
          <p className="kicker">{eyebrow}</p>
          <h2>{title}</h2>
          <p>{description}</p>
        </div>
        <aside className="section-aside">
          <p className="meta-label">Shell Status</p>
          <p>
            Shared route framing is ready. The owning thread can now attach feature-specific data
            views and interactions without reworking layout foundations.
          </p>
        </aside>
      </section>

      <div className="page-grid">
        <section className="section-card">
          <div className="panel-heading">
            <p className="meta-label">Reusable Baseline</p>
            <h3>What is already stable in this route shell</h3>
          </div>

          <ol className="highlight-list">
            {highlights.map((highlight) => (
              <li key={highlight}>{highlight}</li>
            ))}
          </ol>
        </section>

        <EmptyState
          description="Feature modules, data loading, and route-specific actions should be added by the owning thread without changing the shared shell contract."
          eyebrow="Ready for downstream work"
          title="This workspace is intentionally empty"
        />
      </div>
    </div>
  );
}
