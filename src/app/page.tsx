import Link from "next/link";
import { getPublicEnv } from "@/lib/env/public-env";
import { dashboardNavItems } from "@/lib/navigation";
import { siteConfig } from "@/lib/site";
import { designTokenGroups, editorialPrinciples } from "@/lib/theme/foundation";

export default function HomePage(): React.JSX.Element {
  const publicEnv = getPublicEnv();

  return (
    <main className="home-shell" id="main-content">
      <section className="hero-panel hero-panel--primary">
        <div className="hero-copy">
          <p className="kicker">Thread 1 / Editorial Workspace Foundation</p>
          <h1>{siteConfig.name}</h1>
          <p className="lede">
            A content desk shell for Topics, Drafts, Review, and Publish. The base should feel like
            an editorial workspace with measured hierarchy, disciplined surfaces, and a clear
            reading rhythm instead of a generic admin dashboard.
          </p>
          <p className="hero-copy__support">
            Thread 1 defines the shell, not the business. Later threads should be able to plug in
            dense views, filters, actions, and empty states without fighting the layout or inventing
            a second visual system.
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
            <strong>Modern editorial shell, not a templated SaaS frame</strong>
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
          <nav aria-label="Shared routes" className="desk-route-list">
            {dashboardNavItems.map((item) => (
              <Link className="desk-route" href={item.href} key={item.href}>
                <span className="desk-route__index">{item.indexLabel}</span>
                <span className="desk-route__body">
                  <strong>{item.title}</strong>
                  <span>{item.description}</span>
                </span>
                <span className="desk-route__owner">{item.owner}</span>
              </Link>
            ))}
          </nav>
        </div>
      </section>

      <div className="home-grid">
        <section className="editorial-panel editorial-panel--raised">
          <div className="panel-heading">
            <p className="meta-label">Foundation</p>
            <h2>What this UI base is optimizing for</h2>
          </div>

          <div className="principle-list">
            {editorialPrinciples.map((principle, index) => (
              <article className="principle-card" key={principle.title}>
                <p className="principle-card__index">{String(index + 1).padStart(2, "0")}</p>
                <div className="principle-card__body">
                  <h3>{principle.title}</h3>
                  <p>{principle.description}</p>
                </div>
              </article>
            ))}
          </div>
        </section>

        <section className="editorial-panel editorial-panel--muted">
          <div className="panel-heading">
            <p className="meta-label">Token System</p>
            <h2>Global tokens later threads can reuse without rewriting the shell</h2>
          </div>

          <div className="token-list">
            {designTokenGroups.map((group) => (
              <article className="token-card" key={group.name}>
                <div className="token-card__header">
                  <h3>{group.name}</h3>
                  <p>{group.description}</p>
                </div>
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

      <section className="editorial-panel editorial-panel--outline" aria-label="Shared route index">
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
    </main>
  );
}
