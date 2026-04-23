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
            <span className="app-brand__eyebrow">内容工作台</span>
            <strong>编辑台共享底座</strong>
          </Link>
          <p className="app-sidebar__copy">
            线程 1 负责路由框架、共享表面语言和设计合同，后续功能线程直接继承这一层基础。
          </p>
        </div>

        <div className="app-sidebar__section">
          <div className="app-sidebar__section-heading">
            <p className="meta-label">工作区索引</p>
            <p>共享路由与长期稳定的壳层原语。</p>
          </div>
          <DashboardNav items={dashboardNavItems} />
        </div>

        <div className="app-sidebar__stack">
          <section className="app-sidebar__note">
            <p className="meta-label">基础说明</p>
            <p>
              布局、空状态、错误页、加载态和导航统一收敛在这里，方便选题、成稿、审核、发布直接承接。
            </p>
          </section>

          <section className="app-sidebar__note app-sidebar__note--quiet">
            <p className="meta-label">工作规则</p>
            <p>共享壳只描述布局、阅读节奏和工作台语法，不提前写死任何功能分区的业务状态。</p>
          </section>

          <section className="app-sidebar__note app-sidebar__note--quiet">
            <p className="meta-label">设计合同</p>
            <p>
              `DESIGN.md` 负责定义这套壳层语言，后续路由在一个系统内扩展，而不是不断叠加局部样式。
            </p>
          </section>
        </div>
      </aside>

      <div className="app-main">
        <header className="app-header">
          <div className="app-header__lead">
            <p className="kicker">编辑工作区</p>
            <h1>为并行内容线程准备的共享壳层</h1>
            <p className="app-header__copy">
              参考 Sanity Studio、Notion 和近期 Linear
              的界面收敛方式，这个壳层优先保证冷静框架、清晰层级和稳定节奏，再承载高密度内容视图。
            </p>
          </div>
          <div className="app-header__body">
            <div className="app-header__meta">
              <span className="workspace-chip">冷静密度</span>
              <span className="workspace-chip">清晰层级</span>
              <span className="workspace-chip">编辑台底座</span>
            </div>
            <div className="app-header__detail">
              <div className="app-header__stat">
                <span>负责范围</span>
                <strong>线程 1 / 共享壳层</strong>
              </div>
              <div className="app-header__stat">
                <span>建设内容</span>
                <strong>布局、设计变量、共享原语</strong>
              </div>
              <div className="app-header__stat">
                <span>约束来源</span>
                <strong>以 `DESIGN.md` 为设计合同</strong>
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
