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
        <div className="section-stage__body">
          <div className="section-heading">
            <p className="kicker">{eyebrow}</p>
            <h2>{title}</h2>
            <p>{description}</p>
          </div>
        </div>
        <aside className="section-aside">
          <p className="meta-label">壳层状态</p>
          <p>
            共享路由框架已经就位。拥有该目录的线程现在可以直接挂接功能视图和交互，而不需要再回头重做基础布局。
          </p>
          <div className="section-aside__chips">
            <span className="workspace-chip">统一间距</span>
            <span className="workspace-chip">稳定表面</span>
            <span className="workspace-chip">一致状态</span>
          </div>
        </aside>
      </section>

      <div className="page-grid">
        <section className="section-card">
          <div className="panel-heading">
            <p className="meta-label">可复用基线</p>
            <h3>这个路由壳已经稳定下来的基础能力</h3>
          </div>

          <ol className="highlight-list">
            {highlights.map((highlight) => (
              <li key={highlight}>{highlight}</li>
            ))}
          </ol>
        </section>

        <EmptyState
          description="该线程后续只需要补功能模块、数据加载和操作行为，不应该再改动共享壳层合同。"
          eyebrow="等待后续线程接入"
          title="这个工作区当前刻意保持留白"
        />
      </div>
    </div>
  );
}
