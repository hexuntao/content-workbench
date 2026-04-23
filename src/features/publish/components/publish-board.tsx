import Link from "next/link";

import type {
  PublishBoardItem,
  PublishBoardLane,
  PublishBoardSnapshot,
} from "@/features/publish/types";

import styles from "./publish-workbench.module.css";

function formatDate(value: string): string {
  return new Intl.DateTimeFormat("zh-CN", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

function getStatusTone(status: string): "active" | "done" | "failed" {
  if (status === "PUBLISHED" || status === "EXPORTED") {
    return "done";
  }

  if (status === "FAILED") {
    return "failed";
  }

  return "active";
}

function renderLane(lane: PublishBoardLane): React.JSX.Element {
  return (
    <section className={styles.laneCard} key={lane.id}>
      <div className={styles.laneHeader}>
        <div>
          <p className={styles.eyebrow}>Publish Lane</p>
          <h2 className={styles.cardTitle}>{lane.title}</h2>
          <p className={styles.copy}>{lane.description}</p>
        </div>
        <span className={styles.pill}>{lane.items.length} 项</span>
      </div>

      <div className={styles.laneGrid}>
        {lane.items.map((item: PublishBoardItem) => (
          <Link className={styles.packageCard} href={`/publish/${item.id}`} key={item.id}>
            <div className={styles.packageCardMain}>
              <div className={styles.metaRow}>
                <span className={styles.gatePill} data-tone={item.reviewGate}>
                  {item.reviewGateLabel}
                </span>
                <span className={styles.statusPill} data-tone={getStatusTone(item.status)}>
                  {item.statusLabel}
                </span>
                <span className={styles.pill}>{item.channelLabel}</span>
              </div>
              <h3 className={styles.cardTitle}>{item.title}</h3>
              <p className={styles.summary}>{item.summary}</p>
              <div className={styles.metaRow}>
                <span className={styles.pill}>{item.nextActionLabel}</span>
                {item.exportPath ? <span className={styles.pill}>已有导出物</span> : null}
                {item.draftUrl ? <span className={styles.pill}>已有远端草稿</span> : null}
                {item.publishedUrl ? <span className={styles.pill}>已回填发布链接</span> : null}
              </div>
            </div>

            <div className={styles.packageCardMeta}>
              <span className={styles.pill}>更新于 {formatDate(item.updatedAt)}</span>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}

export function PublishBoard({ snapshot }: { snapshot: PublishBoardSnapshot }): React.JSX.Element {
  return (
    <div className={styles.board}>
      <section className={styles.stage}>
        <div className={styles.stageBody}>
          <p className={styles.eyebrow}>Thread 5 / Publish</p>
          <h1 className={styles.headline}>发布准备面板</h1>
          <p className={styles.copy}>
            这里不是字段详情页。每张渠道卡片都在回答三件事：门禁开没开、现在停在哪一步、下一步该执行什么。
          </p>
        </div>

        <aside className={styles.stageAside}>
          <div className={styles.stageAsideCard}>
            <p className={styles.eyebrow}>Release Logic</p>
            <p>
              Export、Remote Draft、Mark Published
              被压成同一条状态轨，避免链接、路径和备注散成信息噪音。
            </p>
          </div>
          {snapshot.featuredPackageId ? (
            <Link className={styles.openLink} href={`/publish/${snapshot.featuredPackageId}`}>
              打开当前主渠道
            </Link>
          ) : null}
        </aside>
      </section>

      <section className={styles.metricGrid}>
        {snapshot.metrics.map((metric) => (
          <article className={styles.metricCard} key={metric.label}>
            <p className={styles.eyebrow}>{metric.label}</p>
            <strong className={styles.metricValue}>{metric.value}</strong>
            <p className={styles.hint}>{metric.hint}</p>
          </article>
        ))}
      </section>

      <div className={styles.laneGrid}>{snapshot.lanes.map(renderLane)}</div>
    </div>
  );
}
