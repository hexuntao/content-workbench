import Link from "next/link";
import { getPublicEnv } from "@/lib/env/public-env";
import { dashboardNavItems } from "@/lib/navigation";
import { siteConfig } from "@/lib/site";
import { designTokenGroups, editorialPrinciples } from "@/lib/theme/foundation";

export default function HomePage(): React.JSX.Element {
  const publicEnv = getPublicEnv();
  const shellRules = [
    "全局只保留一个强调色，其余层次通过纸面、墨色、托盘和规则线建立。",
    "列表行、导航轨、分栏开场区和注记层，比泛用卡片更重要。",
    "后续线程应该继承结构和节奏，而不是重新发明一套视觉系统。",
  ] as const;
  const referenceBlend = ["Notion 的温暖组织", "Sanity 的内容工作区", "Linear 的冷静收敛"] as const;

  return (
    <main className="home-shell" id="main-content">
      <section className="hero-panel hero-panel--primary">
        <div className="hero-copy">
          <p className="kicker">线程 1 / 设计底座修正</p>
          <h1>{siteConfig.name}</h1>
          <p className="lede">
            面向选题、成稿、审核与发布链路的内容工作台底座。它不该像默认后台模板，而应该像一个冷静、克制、可承载高密度信息的中文编辑台。
          </p>
          <p className="hero-copy__support">
            线程 1
            负责把壳层、设计变量、布局语法和状态页先定稳。后续线程只需要接内容、操作和数据，不需要再推翻视觉基础重来。
          </p>
          <div className="action-row">
            <Link className="button-link" href="/topics">
              打开工作台
            </Link>
            <Link className="button-link button-link--secondary" href="/settings">
              查看共享壳层
            </Link>
          </div>
        </div>
        <aside className="hero-docket">
          <div className="meta-block">
            <span className="meta-label">工作台摘要</span>
            <strong>更像编辑台 / 审稿台，而不是套模板的通用后台</strong>
          </div>
          <div className="meta-grid">
            <div className="meta-block">
              <span>当前地址</span>
              <strong>{publicEnv.appUrl}</strong>
            </div>
            <div className="meta-block">
              <span>负责边界</span>
              <strong>`src/app` 与共享布局 / 样式原语</strong>
            </div>
            <div className="meta-block">
              <span>设计关键词</span>
              <strong>编辑感、高级感、冷静、锐利、高信噪比</strong>
            </div>
          </div>
          <div className="manifest-list">
            {shellRules.map((rule, index) => (
              <article className="manifest-rule" key={rule}>
                <span className="manifest-rule__index">{String(index + 1).padStart(2, "0")}</span>
                <p>{rule}</p>
              </article>
            ))}
          </div>
        </aside>
      </section>

      <div className="home-foundation-grid">
        <section className="editorial-panel editorial-panel--outline home-ledger">
          <div className="panel-heading">
            <p className="meta-label">工作区总账</p>
            <h2>已经为后续线程预留好的共享路由与工作区入口</h2>
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
                <span className="feature-card__link">进入分区</span>
              </Link>
            ))}
          </div>
        </section>

        <section className="editorial-panel editorial-panel--muted home-note">
          <div className="panel-heading">
            <p className="meta-label">设计合同</p>
            <h2>共享 UI 现在有了项目级的 `DESIGN.md` 规则文件</h2>
          </div>

          <div className="principle-list">
            {referenceBlend.map((reference, index) => (
              <article className="principle-card principle-card--compact" key={reference}>
                <p className="principle-card__index">{String(index + 1).padStart(2, "0")}</p>
                <div className="principle-card__body">
                  <h3>{reference}</h3>
                  <p>作为设计判断输入使用，不做品牌皮肤级照搬。</p>
                </div>
              </article>
            ))}
          </div>
        </section>
      </div>

      <div className="home-grid">
        <section className="editorial-panel editorial-panel--raised">
          <div className="panel-heading">
            <p className="meta-label">底座目标</p>
            <h2>这一层共享 UI 正在优先解决什么问题</h2>
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
            <p className="meta-label">设计变量</p>
            <h2>后续线程可以直接复用的全局设计变量，而不是重写壳层</h2>
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
    </main>
  );
}
