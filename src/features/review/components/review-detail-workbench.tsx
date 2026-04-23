"use client";

import { useRouter } from "next/navigation";
import { startTransition, useEffectEvent, useState } from "react";

import type {
  ReviewChecklistItem,
  ReviewChecklistState,
  ReviewDecisionInput,
  ReviewDetail,
} from "@/features/review/types";

import styles from "./review-workbench.module.css";

type ActionFeedback = {
  tone: "success" | "danger";
  text: string;
} | null;

type ApiErrorPayload = {
  error?: {
    message?: string;
  };
};

type MarkdownBlock =
  | {
      key: string;
      type: "heading";
      level: 1 | 2 | 3;
      content: string;
    }
  | {
      key: string;
      type: "paragraph";
      content: string;
    };

function formatDate(value: string | null): string {
  if (value === null) {
    return "未决议";
  }

  return new Intl.DateTimeFormat("zh-CN", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

function getPackageTone(status: string): "accent" | "resolved" | "critical" {
  if (status === "PUBLISHED" || status === "EXPORTED") {
    return "resolved";
  }

  if (status === "DRAFT_CREATED") {
    return "accent";
  }

  return "critical";
}

function parseMarkdown(content: string): MarkdownBlock[] {
  const lines = content.split("\n");
  const blocks: MarkdownBlock[] = [];
  let paragraphBuffer: string[] = [];

  const flushParagraph = (): void => {
    if (paragraphBuffer.length === 0) {
      return;
    }

    blocks.push({
      key: `paragraph-${paragraphBuffer.join("-")}`,
      type: "paragraph",
      content: paragraphBuffer.join(" ").trim(),
    });
    paragraphBuffer = [];
  };

  for (const rawLine of lines) {
    const line = rawLine.trim();

    if (line.length === 0) {
      flushParagraph();
      continue;
    }

    if (line.startsWith("### ")) {
      flushParagraph();
      blocks.push({
        key: `heading-3-${line}`,
        type: "heading",
        level: 3,
        content: line.replace("### ", "").trim(),
      });
      continue;
    }

    if (line.startsWith("## ")) {
      flushParagraph();
      blocks.push({
        key: `heading-2-${line}`,
        type: "heading",
        level: 2,
        content: line.replace("## ", "").trim(),
      });
      continue;
    }

    if (line.startsWith("# ")) {
      flushParagraph();
      blocks.push({
        key: `heading-1-${line}`,
        type: "heading",
        level: 1,
        content: line.replace("# ", "").trim(),
      });
      continue;
    }

    paragraphBuffer.push(line);
  }

  flushParagraph();
  return blocks;
}

function renderMarkdown(content: string): React.JSX.Element {
  const blocks = parseMarkdown(content);

  return (
    <div className={styles.prose}>
      {blocks.map((block: MarkdownBlock) => {
        if (block.type === "heading") {
          if (block.level === 1) {
            return <h1 key={block.key}>{block.content}</h1>;
          }

          if (block.level === 2) {
            return <h2 key={block.key}>{block.content}</h2>;
          }

          return <h3 key={block.key}>{block.content}</h3>;
        }

        return <p key={block.key}>{block.content}</p>;
      })}
    </div>
  );
}

async function readJson<T>(response: Response): Promise<T> {
  const payload: unknown = await response.json();
  return payload as T;
}

async function postJson<T>(url: string, body: Record<string, unknown>): Promise<T> {
  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const payload = await readJson<ApiErrorPayload>(response);
    throw new Error(payload.error?.message ?? "Request failed.");
  }

  return readJson<T>(response);
}

function mapChecklist(items: ReviewChecklistItem[]): ReviewChecklistState {
  const state: ReviewChecklistState = {
    factsChecked: false,
    argumentClear: false,
    voiceConsistent: false,
    channelReady: false,
    aiClicheFree: false,
  };

  for (const item of items) {
    state[item.key] = item.checked;
  }

  return state;
}

export function ReviewDetailWorkbench({
  initialDetail,
}: {
  initialDetail: ReviewDetail;
}): React.JSX.Element {
  const router = useRouter();
  const [detail, setDetail] = useState<ReviewDetail>(initialDetail);
  const [comments, setComments] = useState<string>(initialDetail.comments ?? "");
  const [checklist, setChecklist] = useState<ReviewChecklistState>(
    mapChecklist(initialDetail.checklist.items),
  );
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [feedback, setFeedback] = useState<ActionFeedback>(null);

  const syncState = useEffectEvent((nextDetail: ReviewDetail): void => {
    setDetail(nextDetail);
    setComments(nextDetail.comments ?? "");
    setChecklist(mapChecklist(nextDetail.checklist.items));
  });

  const submitDecision = useEffectEvent(
    async (action: "approve" | "request-changes" | "resubmit"): Promise<void> => {
      setIsSubmitting(true);
      setFeedback(null);

      try {
        if (action === "resubmit") {
          const response = await postJson<ReviewDetail>(
            `/api/review/tasks/${detail.task.id}/resubmit`,
            {
              draftId: detail.task.draftId,
              newRewriteId: detail.draft.currentRewriteId,
            },
          );

          syncState(response);
          startTransition(() => {
            router.replace(`/review/${response.task.id}`);
            router.refresh();
          });
          setFeedback({
            tone: "success",
            text: "已创建新的待审任务，并保留上一轮退回上下文。",
          });
          return;
        }

        const payload: ReviewDecisionInput = {
          comments,
          checklist,
        };
        const endpoint =
          action === "approve"
            ? `/api/review/tasks/${detail.task.id}/approve`
            : `/api/review/tasks/${detail.task.id}/request-changes`;
        const response = await postJson<ReviewDetail>(endpoint, payload);

        syncState(response);
        startTransition(() => {
          router.refresh();
        });
        setFeedback({
          tone: "success",
          text:
            action === "approve"
              ? "审核结论已放行，后续发布门禁可以据此判断。"
              : "审核结论已退回，稿件已回到修改阶段。",
        });
      } catch (error: unknown) {
        setFeedback({
          tone: "danger",
          text: error instanceof Error ? error.message : "操作失败。",
        });
      } finally {
        setIsSubmitting(false);
      }
    },
  );

  return (
    <div className={styles.detail}>
      <section className={styles.detailStage}>
        <div className={styles.stageBody}>
          <p className={styles.eyebrow}>Review Detail</p>
          <h1 className={styles.headline}>{detail.draft.title}</h1>
          <p className={styles.copy}>
            这里把待审内容主体、审核依据和最终决策拆成三个区块，避免编辑在一个混杂表单里失去判断重心。
          </p>
        </div>

        <aside className={styles.stageAside}>
          <div className={styles.stageAsideCard}>
            <p className={styles.eyebrow}>Decision State</p>
            <p>
              当前任务状态为 <strong>{detail.task.statusLabel}</strong>
              。审核通过与退回都会改变主链路状态，不能被当作轻量备注处理。
            </p>
          </div>
        </aside>
      </section>

      <div className={styles.detailGrid}>
        <article className={styles.readingPanel}>
          <div>
            <p className={styles.eyebrow}>待审内容主体</p>
            <h2 className={styles.readingTitle}>{detail.draft.selectedLabel}</h2>
          </div>
          <div className={styles.readingMeta}>
            <span className={styles.metaPill} data-tone="accent">
              {detail.draft.statusLabel}
            </span>
            <span className={styles.metaPill}>{detail.draft.draftTypeLabel}</span>
            {detail.draft.currentRewriteTitle ? (
              <span className={styles.metaPill}>{detail.draft.currentRewriteTitle}</span>
            ) : null}
          </div>
          {renderMarkdown(detail.draft.content)}
        </article>

        <section className={styles.auditPanel}>
          <div>
            <p className={styles.eyebrow}>Checklist / 批注区</p>
            <h2 className={styles.auditTitle}>{detail.checklist.completionLabel}</h2>
          </div>

          <div className={styles.checklistList}>
            {detail.checklist.items.map((item: ReviewChecklistItem) => (
              <label className={styles.checklistItem} key={item.key}>
                <input
                  checked={checklist[item.key]}
                  disabled={
                    !detail.capabilities.canApprove && !detail.capabilities.canRequestChanges
                  }
                  onChange={(event: React.ChangeEvent<HTMLInputElement>) => {
                    setChecklist(
                      (current: ReviewChecklistState): ReviewChecklistState => ({
                        ...current,
                        [item.key]: event.target.checked,
                      }),
                    );
                  }}
                  type="checkbox"
                />
                <span>
                  <strong>{item.label}</strong>
                  <p>{item.description}</p>
                </span>
              </label>
            ))}
          </div>

          <div className={styles.commentaryBox}>
            <p className={styles.eyebrow}>评论区</p>
            <textarea
              aria-label="审核评论"
              className={styles.textarea}
              disabled={!detail.capabilities.canApprove && !detail.capabilities.canRequestChanges}
              name="review-comments"
              onChange={(event: React.ChangeEvent<HTMLTextAreaElement>) => {
                setComments(event.target.value);
              }}
              value={comments}
            />
          </div>

          <div>
            <p className={styles.eyebrow}>审核历史 / 重提上下文</p>
            <div className={styles.historyList}>
              {detail.history.map((item) => (
                <article className={styles.historyCard} key={item.id}>
                  <div className={styles.metaRow}>
                    <span
                      className={styles.statusPill}
                      data-tone={
                        item.status === "APPROVED"
                          ? "resolved"
                          : item.status === "CHANGES_REQUESTED"
                            ? "active"
                            : "critical"
                      }
                    >
                      {item.statusLabel}
                    </span>
                    <span className={styles.metaPill}>{item.reviewerEmail ?? "待领取"}</span>
                  </div>
                  <p className={styles.timelineCopy}>{item.contextNote}</p>
                  {item.comments ? <p className={styles.timelineCopy}>{item.comments}</p> : null}
                  <div className={styles.timeline}>
                    <span className={styles.metaPill}>创建 {formatDate(item.createdAt)}</span>
                    <span className={styles.metaPill}>决议 {formatDate(item.decidedAt)}</span>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </section>

        <aside className={styles.decisionDock}>
          <div>
            <p className={styles.eyebrow}>决策区</p>
            <h2 className={styles.dockTitle}>{detail.decision.primaryLabel}</h2>
          </div>

          <div className={styles.decisionMeta}>
            <strong>{detail.decision.riskLabel}</strong>
            <p className={styles.metaCopy}>{detail.decision.guidance}</p>
            <div className={styles.packageStrip}>
              {detail.publishPackages.map((item) => (
                <span
                  className={styles.packageChip}
                  data-tone={getPackageTone(item.status)}
                  key={item.id}
                >
                  {item.channelLabel} · {item.statusLabel}
                </span>
              ))}
            </div>
          </div>

          <div className={styles.buttonRow}>
            <button
              className={styles.button}
              disabled={!detail.capabilities.canApprove || isSubmitting}
              onClick={() => {
                void submitDecision("approve");
              }}
              type="button"
            >
              Approve
            </button>
            <button
              className={styles.buttonDanger}
              disabled={!detail.capabilities.canRequestChanges || isSubmitting}
              onClick={() => {
                void submitDecision("request-changes");
              }}
              type="button"
            >
              Request Changes
            </button>
            <button
              className={styles.buttonSecondary}
              disabled={!detail.capabilities.canResubmit || isSubmitting}
              onClick={() => {
                void submitDecision("resubmit");
              }}
              type="button"
            >
              Resubmit
            </button>
          </div>

          {detail.capabilities.disabledReason ? (
            <div aria-live="polite" className={styles.feedback} data-tone="danger">
              {detail.capabilities.disabledReason}
            </div>
          ) : null}
          {feedback ? (
            <div aria-live="polite" className={styles.feedback} data-tone={feedback.tone}>
              {feedback.text}
            </div>
          ) : null}

          <div className={styles.noticeList}>
            {detail.notices.map((notice) => (
              <article className={styles.notice} data-tone={notice.tone} key={notice.title}>
                <strong>{notice.title}</strong>
                <p className={styles.noticeDescription}>{notice.description}</p>
              </article>
            ))}
          </div>
        </aside>
      </div>
    </div>
  );
}
