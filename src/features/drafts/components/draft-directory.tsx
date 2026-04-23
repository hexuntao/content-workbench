import Link from "next/link";

import type { DraftDirectoryItem } from "@/features/drafts/types";

import styles from "./draft-workbench.module.css";

type DraftDirectoryProps = {
  drafts: DraftDirectoryItem[];
  featuredDraftId: string | null;
};

function formatDate(date: string): string {
  return new Intl.DateTimeFormat("zh-CN", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(date));
}

function getStatusTone(status: string): "accent" | "success" | "warning" {
  if (status === "PACKAGED") {
    return "success";
  }

  if (status === "REWRITTEN") {
    return "accent";
  }

  return "warning";
}

export function DraftDirectory({
  drafts,
  featuredDraftId,
}: DraftDirectoryProps): React.JSX.Element {
  return (
    <div className={styles.directory}>
      <section className={styles.directoryStage}>
        <div className={styles.directoryStageBody}>
          <p className={styles.eyebrow}>Thread 4 / Drafts</p>
          <h1 className={styles.directoryTitle}>成稿、改写与包装的编辑工作台</h1>
          <p className={styles.directoryCopy}>
            这里不是数据库详情页。目录只负责把当前母稿状态、当前选择版本和下一步包装意图清楚铺开，真正的阅读与判断发生在详情工作台里。
          </p>
        </div>

        <aside className={styles.directoryStageAside}>
          <div className={styles.directoryAsideCard}>
            <p className={styles.sectionLabel}>进入方式</p>
            <p className={styles.metaCopy}>
              打开任一稿件后，主区域负责正文阅读与判断，右侧只保留版本切换、当前选择和包装推进，不让两边争抢视觉中心。
            </p>
          </div>
        </aside>
      </section>

      <section className={styles.directoryList}>
        {drafts.map((draft: DraftDirectoryItem) => (
          <Link className={styles.directoryCard} href={`/drafts/${draft.id}`} key={draft.id}>
            <div className={styles.directoryCardHead}>
              <span className={styles.metaPill} data-tone="accent">
                {draft.draftTypeLabel}
              </span>
              <span className={styles.statusPill} data-tone={getStatusTone(draft.status)}>
                {draft.statusLabel}
              </span>
            </div>

            <div className={styles.directoryCardBody}>
              <h2 className={styles.directoryCardTitle}>{draft.title}</h2>
              <p className={styles.directoryCopy}>{draft.summary}</p>
            </div>

            <div className={styles.directoryCardFoot}>
              <span className={styles.metaPill}>{draft.currentRewriteLabel}</span>
              <span className={styles.metaPill}>v{draft.version}</span>
              <span className={styles.metaPill}>更新于 {formatDate(draft.updatedAt)}</span>
              {featuredDraftId === draft.id ? (
                <span className={styles.metaPill} data-tone="accent">
                  最近工作面
                </span>
              ) : null}
            </div>
          </Link>
        ))}
      </section>
    </div>
  );
}
