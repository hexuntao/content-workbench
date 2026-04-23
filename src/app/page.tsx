import Link from "next/link";
import { getPublicEnv } from "@/lib/env/public-env";
import { dashboardNavItems } from "@/lib/navigation";
import { siteConfig } from "@/lib/site";

export default function HomePage(): React.JSX.Element {
  const publicEnv = getPublicEnv();

  return (
    <main className="home-shell">
      <section className="hero-panel">
        <div className="hero-copy">
          <p className="eyebrow">Thread 1 / Project Shell</p>
          <h1>{siteConfig.name}</h1>
          <p className="lede">
            A stable App Router shell for Topics, Drafts, Review, and Publish. This foundation keeps
            routing, layout, and shared UI predictable while later threads fill in feature-specific
            behavior.
          </p>
        </div>
        <div className="hero-meta">
          <div className="meta-block">
            <span>Base URL</span>
            <strong>{publicEnv.appUrl}</strong>
          </div>
          <div className="meta-block">
            <span>Shared Entry</span>
            <strong>src/app + src/components + src/lib + src/styles</strong>
          </div>
          <div className="action-row">
            <Link className="button-link" href="/topics">
              Open Dashboard
            </Link>
            <Link className="button-link button-link--secondary" href="/settings">
              View Settings Shell
            </Link>
          </div>
        </div>
      </section>

      <section className="card-grid" aria-label="Dashboard modules">
        {dashboardNavItems.map((item) => (
          <Link className="feature-card" href={item.href} key={item.href}>
            <p className="feature-card__eyebrow">{item.owner}</p>
            <h2>{item.title}</h2>
            <p>{item.description}</p>
            <span className="feature-card__link">Open {item.title}</span>
          </Link>
        ))}
      </section>
    </main>
  );
}
