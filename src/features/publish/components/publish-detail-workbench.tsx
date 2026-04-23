"use client";

import { useRouter } from "next/navigation";
import { startTransition, useEffectEvent, useState } from "react";

import type {
  PublishActionJobResponse,
  PublishDetail,
  PublishStage,
} from "@/features/publish/types";

import styles from "./publish-workbench.module.css";

type ActionFeedback = {
  tone: "success" | "danger";
  text: string;
} | null;

type ApiErrorPayload = {
  error?: {
    message?: string;
  };
};

function toDateTimeLocalValue(value: string): string {
  const date = new Date(value);
  const offsetMinutes = date.getTimezoneOffset();
  const localDate = new Date(date.getTime() - offsetMinutes * 60_000);
  return localDate.toISOString().slice(0, 16);
}

function fromDateTimeLocalValue(value: string): string {
  return new Date(value).toISOString();
}

function formatDate(value: string | null): string {
  if (value === null) {
    return "未回填";
  }

  return new Intl.DateTimeFormat("zh-CN", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

function getStageTone(state: PublishStage["state"]): "active" | "done" | "failed" {
  if (state === "done") {
    return "done";
  }

  if (state === "failed") {
    return "failed";
  }

  return "active";
}

async function readJson<T>(response: Response): Promise<T> {
  const payload: unknown = await response.json();
  return payload as T;
}

async function getDetail(publishPackageId: string): Promise<PublishDetail> {
  const response = await fetch(`/api/publish/packages/${publishPackageId}`, {
    method: "GET",
    cache: "no-store",
  });

  if (!response.ok) {
    const payload = await readJson<ApiErrorPayload>(response);
    throw new Error(payload.error?.message ?? "Failed to load package.");
  }

  return readJson<PublishDetail>(response);
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

async function wait(ms: number): Promise<void> {
  await new Promise<void>((resolve: () => void) => {
    setTimeout(() => {
      resolve();
    }, ms);
  });
}

export function PublishDetailWorkbench({
  initialDetail,
}: {
  initialDetail: PublishDetail;
}): React.JSX.Element {
  const router = useRouter();
  const [detail, setDetail] = useState<PublishDetail>(initialDetail);
  const [publishedUrl, setPublishedUrl] = useState<string>(
    initialDetail.publication?.publishedUrl ?? "https://example.com/published/final-link",
  );
  const [publishedAt, setPublishedAt] = useState<string>(
    toDateTimeLocalValue(initialDetail.publication?.publishedAt ?? new Date().toISOString()),
  );
  const [notes, setNotes] = useState<string>(initialDetail.publication?.notes ?? "");
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [feedback, setFeedback] = useState<ActionFeedback>(null);

  const syncDetail = useEffectEvent((nextDetail: PublishDetail): void => {
    setDetail(nextDetail);
    setPublishedUrl(nextDetail.publication?.publishedUrl ?? publishedUrl);
    setPublishedAt(
      nextDetail.publication?.publishedAt
        ? toDateTimeLocalValue(nextDetail.publication.publishedAt)
        : publishedAt,
    );
    setNotes(nextDetail.publication?.notes ?? notes);
  });

  const triggerJobAction = useEffectEvent(
    async (action: "export" | "remote-draft"): Promise<void> => {
      setIsSubmitting(true);
      setFeedback(null);

      try {
        const endpoint =
          action === "export"
            ? `/api/publish/packages/${detail.package.id}/export`
            : `/api/publish/packages/${detail.package.id}/create-remote-draft`;
        const response = await postJson<PublishActionJobResponse>(endpoint, {
          channelAccountId: "default",
        });

        setFeedback({
          tone: "success",
          text:
            action === "export"
              ? `导出任务已入队：${response.jobId}`
              : `远端草稿任务已入队：${response.jobId}`,
        });

        await wait(1100);
        const nextDetail = await getDetail(detail.package.id);
        syncDetail(nextDetail);
        startTransition(() => {
          router.refresh();
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

  const markPublished = useEffectEvent(async (): Promise<void> => {
    setIsSubmitting(true);
    setFeedback(null);

    try {
      const nextDetail = await postJson<PublishDetail>(
        `/api/publish/packages/${detail.package.id}/mark-published`,
        {
          publishedUrl,
          publishedAt: fromDateTimeLocalValue(publishedAt),
          notes,
        },
      );

      syncDetail(nextDetail);
      startTransition(() => {
        router.refresh();
      });
      setFeedback({
        tone: "success",
        text: "发布记录已回填，状态轨已更新为已发布。",
      });
    } catch (error: unknown) {
      setFeedback({
        tone: "danger",
        text: error instanceof Error ? error.message : "操作失败。",
      });
    } finally {
      setIsSubmitting(false);
    }
  });

  return (
    <div className={styles.detail}>
      <section className={styles.detailStage}>
        <div className={styles.stageBody}>
          <p className={styles.eyebrow}>Publish Detail</p>
          <h1 className={styles.headline}>{detail.package.title}</h1>
          <p className={styles.copy}>
            这个面板把渠道状态、动作顺序和最终证据放在同一张桌面上，让人明确感到自己正在做发布前的最后推进。
          </p>
        </div>

        <aside className={styles.stageAside}>
          <div className={styles.stageAsideCard}>
            <p className={styles.eyebrow}>Gate Status</p>
            <p>
              当前稿件状态为 <strong>{detail.draft.statusLabel}</strong>，最近一轮审核状态为{" "}
              <strong>{detail.draft.reviewStatusLabel ?? "暂无记录"}</strong>。
            </p>
          </div>
        </aside>
      </section>

      <div className={styles.detailGrid}>
        <article className={styles.contentPanel}>
          <div>
            <p className={styles.eyebrow}>发布包内容</p>
            <h2 className={styles.panelTitle}>{detail.package.channelLabel}</h2>
          </div>
          <div className={styles.metaRow}>
            <span
              className={styles.gatePill}
              data-tone={detail.draft.status === "READY_TO_PUBLISH" ? "ready" : "locked"}
            >
              {detail.draft.statusLabel}
            </span>
            <span
              className={styles.statusPill}
              data-tone={getStageTone(detail.stages.at(-1)?.state ?? "active")}
            >
              {detail.package.statusLabel}
            </span>
          </div>
          <pre>{detail.package.content}</pre>
        </article>

        <section className={styles.stagePanel}>
          <div>
            <p className={styles.eyebrow}>状态推进</p>
            <h2 className={styles.panelTitle}>Export → Remote Draft → Published</h2>
          </div>
          <div className={styles.statusRail}>
            {detail.stages.map((stage: PublishStage) => (
              <article className={styles.statusStep} data-state={stage.state} key={stage.key}>
                <div className={styles.metaRow}>
                  <span className={styles.statusPill} data-tone={getStageTone(stage.state)}>
                    {stage.label}
                  </span>
                  <span className={styles.pill}>{stage.state}</span>
                </div>
                <p className={styles.metaCopy}>{stage.description}</p>
                <div className={styles.artifactRow}>
                  <span className={styles.artifactKey}>{stage.artifactLabel}</span>
                  <span className={styles.artifactValue}>{stage.artifactValue ?? "尚未生成"}</span>
                </div>
              </article>
            ))}
          </div>

          <div className={styles.jobList}>
            <p className={styles.eyebrow}>最近任务</p>
            {detail.jobs.length > 0 ? (
              detail.jobs.map((job) => (
                <article className={styles.jobCard} key={job.id}>
                  <div className={styles.metaRow}>
                    <span className={styles.pill}>{job.label}</span>
                    <span
                      className={styles.statusPill}
                      data-tone={
                        job.status === "FAILED"
                          ? "failed"
                          : job.status === "SUCCEEDED"
                            ? "done"
                            : "active"
                      }
                    >
                      {job.status}
                    </span>
                  </div>
                  <p className={styles.metaCopy}>更新于 {formatDate(job.updatedAt)}</p>
                  {job.errorMessage ? <p className={styles.metaCopy}>{job.errorMessage}</p> : null}
                </article>
              ))
            ) : (
              <div className={styles.notice}>尚无后台任务记录。</div>
            )}
          </div>
        </section>

        <aside className={styles.actionDock}>
          <div>
            <p className={styles.eyebrow}>动作区</p>
            <h2 className={styles.dockTitle}>下一步推进</h2>
          </div>

          <div className={styles.buttonRow}>
            <button
              className={styles.button}
              disabled={!detail.capabilities.canExport || isSubmitting}
              onClick={() => {
                void triggerJobAction("export");
              }}
              type="button"
            >
              Export
            </button>
            <button
              className={styles.buttonSecondary}
              disabled={!detail.capabilities.canCreateRemoteDraft || isSubmitting}
              onClick={() => {
                void triggerJobAction("remote-draft");
              }}
              type="button"
            >
              Create Remote Draft
            </button>
          </div>

          {!detail.capabilities.canExport && detail.capabilities.exportDisabledReason ? (
            <div aria-live="polite" className={styles.feedback} data-tone="danger">
              {detail.capabilities.exportDisabledReason}
            </div>
          ) : null}
          {!detail.capabilities.canCreateRemoteDraft &&
          detail.capabilities.remoteDraftDisabledReason ? (
            <div aria-live="polite" className={styles.feedback} data-tone="danger">
              {detail.capabilities.remoteDraftDisabledReason}
            </div>
          ) : null}

          <div className={styles.formBlock}>
            <p className={styles.eyebrow}>发布回填</p>
            <label className={styles.metaCopy} htmlFor="published-url">
              Published URL
            </label>
            <input
              aria-label="最终发布链接"
              className={styles.textarea}
              id="published-url"
              name="publishedUrl"
              onChange={(event: React.ChangeEvent<HTMLInputElement>) => {
                setPublishedUrl(event.target.value);
              }}
              type="url"
              value={publishedUrl}
            />
            <label className={styles.metaCopy} htmlFor="published-at">
              Published At
            </label>
            <input
              aria-label="发布时间"
              className={styles.textarea}
              id="published-at"
              name="publishedAt"
              onChange={(event: React.ChangeEvent<HTMLInputElement>) => {
                setPublishedAt(event.target.value);
              }}
              type="datetime-local"
              value={publishedAt}
            />
            <label className={styles.metaCopy} htmlFor="publish-notes">
              Notes
            </label>
            <textarea
              aria-label="发布备注"
              className={styles.textarea}
              id="publish-notes"
              name="notes"
              onChange={(event: React.ChangeEvent<HTMLTextAreaElement>) => {
                setNotes(event.target.value);
              }}
              value={notes}
            />
            <button
              className={styles.buttonDanger}
              disabled={!detail.capabilities.canMarkPublished || isSubmitting}
              onClick={() => {
                void markPublished();
              }}
              type="button"
            >
              Mark Published
            </button>
          </div>

          {!detail.capabilities.canMarkPublished &&
          detail.capabilities.markPublishedDisabledReason ? (
            <div aria-live="polite" className={styles.feedback} data-tone="danger">
              {detail.capabilities.markPublishedDisabledReason}
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
                <p className={styles.metaCopy}>{notice.description}</p>
              </article>
            ))}
          </div>
        </aside>
      </div>
    </div>
  );
}
