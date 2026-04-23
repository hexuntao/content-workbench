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
        <div className="app-sidebar__top">
          <Link className="app-brand" href="/">
            <span className="app-brand__eyebrow">Content Workbench</span>
            <strong>Editorial Desk Shell</strong>
          </Link>
          <p className="app-sidebar__copy">
            Thread 1 owns the routing frame, shared surfaces, and reusable UI cadence for later
            feature work.
          </p>
        </div>

        <div className="app-sidebar__section">
          <p className="meta-label">Desk Index</p>
          <DashboardNav items={dashboardNavItems} />
        </div>

        <section className="app-sidebar__note">
          <p className="meta-label">Foundation Note</p>
          <p>
            Layout, empty states, errors, loading, and navigation stay centralized here so Topics,
            Drafts, Review, and Publish can inherit a stable visual base.
          </p>
        </section>
      </aside>

      <div className="app-main">
        <header className="app-header">
          <div className="app-header__lead">
            <p className="kicker">Editorial Workspace</p>
            <h1>Shared shell for parallel content threads</h1>
          </div>
          <div className="app-header__meta">
            <span className="workspace-chip">Calm density</span>
            <span className="workspace-chip">Sharp hierarchy</span>
            <span className="workspace-chip">Reusable surfaces</span>
          </div>
          <p className="app-header__copy">
            This shell is intentionally generic at the business layer, but specific in layout,
            typography, and interaction rhythm.
          </p>
        </header>

        <main className="app-content">{children}</main>
      </div>
    </div>
  );
}
