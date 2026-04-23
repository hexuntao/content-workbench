import Link from "next/link";
import { getPublicEnv } from "@/lib/env/public-env";
import { dashboardNavItems } from "@/lib/navigation";
import { siteConfig } from "@/lib/site";
import { designTokenGroups, editorialPrinciples } from "@/lib/theme/foundation";

export default function HomePage(): React.JSX.Element {
  const publicEnv = getPublicEnv();

  return (
    <main className="home-shell">
      <section className="hero-panel hero-panel--primary">
        <div className="hero-copy">
          <p className="kicker">Thread 1 / Editorial Workspace Foundation</p>
          <h1>{siteConfig.name}</h1>
          <p className="lede">
            A modern content desk shell for Topics, Drafts, Review, and Publish. The goal is not a
            generic admin dashboard, but a calm editorial base with sharp hierarchy, consistent
            surfaces, and reusable route rhythm.
          </p>
          <p className="hero-copy__support">
            Thread 1 keeps the workbench coherent so later threads can attach dense feature views
            without rethinking spacing, layout, or primitive styling.
          </p>
          <div className="action-row">
            <Link className="button-link" href="/topics">
              Open the Desk
            </Link>
            <Link className="button-link button-link--secondary" href="/settings">
              Inspect Shared Shell
            </Link>
          </div>
        </div>
        <div className="hero-meta hero-meta--desk">
          <div className="meta-block">
            <span className="meta-label">Desk Brief</span>
            <strong>Modern editorial shell, not a default SaaS frame</strong>
          </div>
          <div className="meta-grid">
            <div className="meta-block">
              <span>Base URL</span>
              <strong>{publicEnv.appUrl}</strong>
            </div>
            <div className="meta-block">
              <span>Owned Boundary</span>
              <strong>`src/app` + shared layout and style primitives</strong>
            </div>
            <div className="meta-block">
              <span>Design Axis</span>
              <strong>Editorial, premium, calm, sharp, high signal density</strong>
            </div>
          </div>
        </div>
      </section>

      <div className="home-grid">
        <section
          className="editorial-panel editorial-panel--raised"
          aria-label="Shared route index"
        >
          <div className="panel-heading">
            <p className="meta-label">Route Index</p>
            <h2>Shared desk sections ready for downstream threads</h2>
          </div>

          <div className="feature-list">
            {dashboardNavItems.map((item) => (
              <Link className="feature-card" href={item.href} key={item.href}>
                <span className="feature-card__index">{item.indexLabel}</span>
                <div className="feature-card__body">
                  <p className="feature-card__eyebrow">{item.owner}</p>
                  <h3>{item.title}</h3>
                  <p>{item.description}</p>
                </div>
                <span className="feature-card__link">Open section</span>
              </Link>
            ))}
          </div>
        </section>

        <section className="editorial-panel editorial-panel--muted">
          <div className="panel-heading">
            <p className="meta-label">Foundation</p>
            <h2>What this UI base is optimizing for</h2>
          </div>

          <div className="principle-list">
            {editorialPrinciples.map((principle) => (
              <article className="principle-card" key={principle.title}>
                <h3>{principle.title}</h3>
                <p>{principle.description}</p>
              </article>
            ))}
          </div>

          <div className="token-list">
            {designTokenGroups.map((group) => (
              <article className="token-card" key={group.name}>
                <h3>{group.name}</h3>
                <p>{group.description}</p>
                <ul>
                  {group.tokens.map((token) => (
                    <li key={token}>{token}</li>
                  ))}
                </ul>
              </article>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}
