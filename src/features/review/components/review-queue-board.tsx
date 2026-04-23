import Link from "next/link";

import type {
  ReviewQueueItem,
  ReviewQueueLane,
  ReviewQueueSnapshot,
} from "@/features/review/types";

import styles from "./review-workbench.module.css";

function getTone(item: ReviewQueueItem): "critical" | "active" | "resolved" {
  return item.priorityBand;
}

function formatDate(value: string): string {
  return new Intl.DateTimeFormat("zh-CN", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

function renderLane(lane: ReviewQueueLane): React.JSX.Element {
  return (
    <section className={styles.laneCard} key={lane.id}>
      <div className={styles.laneHeader}>
        <div>
          <p className={styles.eyebrow}>Review Lane</p>
          <h2 className={styles.queueTitle}>{lane.title}</h2>
          <p className={styles.laneDescription}>{lane.description}</p>
        </div>
        <span className={styles.laneCount}>{lane.count} 项</span>
      </div>

      {lane.items.length > 0 ? (
        <div className={styles.laneGrid}>
          {lane.items.map((item: ReviewQueueItem) => (
            <Link className={styles.queueCard} href={`/review/${item.id}`} key={item.id}>
              <div className={styles.queueCardMain}>
                <div className={styles.metaRow}>
                  <span className={styles.statusPill} data-tone={getTone(item)}>
                    {item.priorityLabel}
                  </span>
                  <span className={styles.metaPill}>{item.statusLabel}</span>
                  <span className={styles.metaPill}>{item.queueLabel}</span>
                </div>
                <h3 className={styles.queueTitle}>{item.title}</h3>
                <p className={styles.queueSummary}>{item.summary}</p>
                <p className={styles.queueFocus}>{item.decisionFocus}</p>
                <div className={styles.metaRow}>
                  <span className={styles.metaPill}>{item.currentRewriteTitle ?? "母稿版本"}</span>
                  <span className={styles.metaPill}>{item.channelCount} 个渠道包</span>
                  <span className={styles.metaPill}>{item.historyCount} 条审核上下文</span>
                </div>
              </div>

              <div className={styles.queueCardMeta}>
                <span className={styles.metaPill} data-tone="accent">
                  {item.reviewerEmail ?? "待领取"}
                </span>
                <span className={styles.metaPill}>更新于 {formatDate(item.updatedAt)}</span>
              </div>
            </Link>
          ))}
        </div>
      ) : (
        <div className={styles.emptyLine}>当前 lane 为空，说明这一段流程暂时没有待处理任务。</div>
      )}
    </section>
  );
}

export function ReviewQueueBoard({
  snapshot,
}: {
  snapshot: ReviewQueueSnapshot;
}): React.JSX.Element {
  return (
    <div className={styles.board}>
      <section className={styles.stage}>
        <div className={styles.stageBody}>
          <p className={styles.eyebrow}>Thread 5 / Review</p>
          <h1 className={styles.headline}>审稿决策台</h1>
          <p className={styles.copy}>
            这里先铺开判断优先级，再让编辑进入具体稿件。队列不是普通列表，而是一张正在等待签发的决策桌面。
          </p>
        </div>

        <aside className={styles.stageAside}>
          <div className={styles.stageAsideCard}>
            <p className={styles.eyebrow}>Decision Logic</p>
            <p>
              主任务只保留仍在门禁内的稿件，修订返回和已放行上下文被分到独立
              lane，避免把不同责任状态混成一串表格。
            </p>
          </div>
          {snapshot.featuredTaskId ? (
            <Link className={styles.openLink} href={`/review/${snapshot.featuredTaskId}`}>
              打开当前主任务
            </Link>
          ) : null}
        </aside>
      </section>

      <section className={styles.metricGrid}>
        {snapshot.metrics.map((metric) => (
          <article className={styles.metricCard} key={metric.label}>
            <p className={styles.eyebrow}>{metric.label}</p>
            <strong className={styles.metricValue}>{metric.value}</strong>
            <p className={styles.metricHint}>{metric.hint}</p>
          </article>
        ))}
      </section>

      <div className={styles.laneGrid}>{snapshot.lanes.map(renderLane)}</div>
    </div>
  );
}
