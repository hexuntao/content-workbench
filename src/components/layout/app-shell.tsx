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
        <Link className="app-brand" href="/">
          <span className="app-brand__eyebrow">Content Workbench</span>
          <strong>Shared Dashboard Shell</strong>
        </Link>
        <p className="app-sidebar__copy">
          Thread 1 owns the routing frame, global states, and reusable entry points for later
          feature work.
        </p>
        <DashboardNav items={dashboardNavItems} />
      </aside>

      <div className="app-main">
        <header className="app-header">
          <div>
            <p className="eyebrow">App Router Foundation</p>
            <h1>Stable shared entry points</h1>
          </div>
          <p className="app-header__copy">
            Layout, error handling, and empty-state primitives are ready for downstream feature
            threads.
          </p>
        </header>
        <main className="app-content">{children}</main>
      </div>
    </div>
  );
}
