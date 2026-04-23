import Link from "next/link";
import type { ReactNode } from "react";

import { dashboardNavItems } from "@/lib/navigation";

import { DashboardNav } from "./dashboard-nav";

type AppShellProps = Readonly<{
  children: ReactNode;
}>;

export function AppShell({ children }: AppShellProps): React.JSX.Element {
  return (
    <div className="app-shell">
      <aside className="app-sidebar">
        <div className="app-sidebar__masthead">
          <Link className="app-brand" href="/">
            <span className="app-brand__eyebrow">Content Workbench</span>
            <strong>Editorial Desk Shell</strong>
          </Link>
          <p className="app-sidebar__copy">
            Thread 1 owns the routing frame, shared surfaces, and the visual cadence that later
            feature threads inherit.
          </p>
        </div>

        <div className="app-sidebar__section">
          <div className="app-sidebar__section-heading">
            <p className="meta-label">Desk Index</p>
            <p>Shared routes and long-lived shell primitives.</p>
          </div>
          <DashboardNav items={dashboardNavItems} />
        </div>

        <div className="app-sidebar__stack">
          <section className="app-sidebar__note">
            <p className="meta-label">Foundation Note</p>
            <p>
              Layout, empty states, errors, loading, and navigation stay centralized here so Topics,
              Drafts, Review, and Publish can inherit a stable visual base.
            </p>
          </section>

          <section className="app-sidebar__note app-sidebar__note--quiet">
            <p className="meta-label">Working Rule</p>
            <p>
              Shared shell pieces should describe layout and reading rhythm, never feature-specific
              business states.
            </p>
          </section>
        </div>
      </aside>

      <div className="app-main">
        <header className="app-header">
          <div className="app-header__lead">
            <p className="kicker">Editorial Workspace</p>
            <h1>Shared shell for parallel content threads</h1>
            <p className="app-header__copy">
              A modern content workbench needs a calm frame, sharp type hierarchy, and predictable
              section rhythm before feature teams add dense data views.
            </p>
          </div>
          <div className="app-header__body">
            <div className="app-header__meta">
              <span className="workspace-chip">Calm density</span>
              <span className="workspace-chip">Sharp hierarchy</span>
              <span className="workspace-chip">Reusable surfaces</span>
            </div>
            <div className="app-header__detail">
              <div className="app-header__stat">
                <span>Owner</span>
                <strong>Thread 1 / shared shell</strong>
              </div>
              <div className="app-header__stat">
                <span>Scope</span>
                <strong>Layout, tokens, primitives</strong>
              </div>
              <div className="app-header__stat">
                <span>Intent</span>
                <strong>Content desk, not admin chrome</strong>
              </div>
            </div>
          </div>
        </header>

        <main className="app-content" id="main-content">
          {children}
        </main>
      </div>
    </div>
  );
}
