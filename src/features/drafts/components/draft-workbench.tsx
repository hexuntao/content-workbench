"use client";

import Link from "next/link";
import { startTransition, useEffect, useEffectEvent, useState } from "react";

import type {
  DraftActionJobResponse,
  DraftDirectoryItem,
  DraftWorkbenchDetail,
  DraftWorkbenchNotice,
} from "@/features/drafts/types";

import styles from "./draft-workbench.module.css";

type DraftWorkbenchProps = {
  draftId: string;
  initialDetail: DraftWorkbenchDetail;
  relatedDrafts: DraftDirectoryItem[];
};

type ActionMessage = {
  tone: "success" | "danger";
  text: string;
} | null;

type ApiErrorPayload = {
  error?: {
    code?: string;
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
    }
  | {
      key: string;
      type: "list";
      items: string[];
    }
  | {
      key: string;
      type: "blockquote";
      content: string;
    };

function formatDate(value: string): string {
  return new Intl.DateTimeFormat("zh-CN", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

function getStatusTone(status: string): "accent" | "success" | "warning" | "danger" {
  if (status === "SUCCEEDED" || status === "PACKAGED" || status === "EXPORTED") {
    return "success";
  }

  if (status === "RUNNING" || status === "REWRITTEN" || status === "DRAFT_CREATED") {
    return "accent";
  }

  if (status === "FAILED" || status === "ARCHIVED") {
    return "danger";
  }

  return "warning";
}

function parseMarkdown(content: string): MarkdownBlock[] {
  const lines = content.split("\n");
  const blocks: MarkdownBlock[] = [];
  let paragraphBuffer: string[] = [];
  let listBuffer: string[] = [];

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

  const flushList = (): void => {
    if (listBuffer.length === 0) {
      return;
    }

    blocks.push({
      key: `list-${listBuffer.join("-")}`,
      type: "list",
      items: listBuffer,
    });
    listBuffer = [];
  };

  for (const rawLine of lines) {
    const line = rawLine.trim();

    if (line.length === 0) {
      flushParagraph();
      flushList();
      continue;
    }

    if (line.startsWith("- ")) {
      flushParagraph();
      listBuffer.push(line.replace("- ", "").trim());
      continue;
    }

    flushList();

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

    if (line.startsWith("> ")) {
      flushParagraph();
      blocks.push({
        key: `blockquote-${line}`,
        type: "blockquote",
        content: line.replace("> ", "").trim(),
      });
      continue;
    }

    paragraphBuffer.push(line);
  }

  flushParagraph();
  flushList();

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

        if (block.type === "list") {
          return (
            <ul key={block.key}>
              {block.items.map((item: string) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          );
        }

        if (block.type === "blockquote") {
          return <blockquote key={block.key}>{block.content}</blockquote>;
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

async function fetchWorkbenchDetail(draftId: string): Promise<DraftWorkbenchDetail> {
  const response = await fetch(`/api/drafts/${draftId}`, {
    method: "GET",
    cache: "no-store",
  });

  if (!response.ok) {
    const payload = await readJson<ApiErrorPayload>(response);
    throw new Error(payload.error?.message ?? "Failed to load draft.");
  }

  return readJson<DraftWorkbenchDetail>(response);
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

function renderNotices(notices: DraftWorkbenchNotice[]): React.JSX.Element {
  return (
    <div className={styles.noticeList}>
      {notices.map((notice: DraftWorkbenchNotice) => (
        <article className={styles.notice} data-tone={notice.tone} key={notice.title}>
          <strong className={styles.noticeTitle}>{notice.title}</strong>
          <p className={styles.noticeDescription}>{notice.description}</p>
        </article>
      ))}
    </div>
  );
}

export function DraftWorkbench({
  draftId,
  initialDetail,
  relatedDrafts,
}: DraftWorkbenchProps): React.JSX.Element {
  const [detail, setDetail] = useState<DraftWorkbenchDetail>(initialDetail);
  const [selectedChannels, setSelectedChannels] = useState<string[]>(["WECHAT", "XHS"]);
  const [actionMessage, setActionMessage] = useState<ActionMessage>(null);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [isTriggeringRewrite, setIsTriggeringRewrite] = useState<boolean>(false);
  const [isPackaging, setIsPackaging] = useState<boolean>(false);
  const [pendingRewriteId, setPendingRewriteId] = useState<string | null>(null);

  const hasRunningJobs = detail.activeJobs.length > 0;

  const refreshDetail = useEffectEvent(async (): Promise<void> => {
    setIsRefreshing(true);

    try {
      const nextDetail = await fetchWorkbenchDetail(draftId);
      startTransition(() => {
        setDetail(nextDetail);
      });
    } catch (error: unknown) {
      setActionMessage({
        tone: "danger",
        text: error instanceof Error ? error.message : "刷新稿件失败。",
      });
    } finally {
      setIsRefreshing(false);
    }
  });

  useEffect(() => {
    startTransition(() => {
      setDetail(initialDetail);
      setActionMessage(null);
      setPendingRewriteId(null);
    });
  }, [initialDetail]);

  useEffect(() => {
    if (!hasRunningJobs) {
      return undefined;
    }

    const intervalId = window.setInterval(() => {
      void refreshDetail();
    }, 1200);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [hasRunningJobs]);

  const handleTriggerRewrite = async (): Promise<void> => {
    setIsTriggeringRewrite(true);
    setActionMessage(null);

    try {
      const payload = await postJson<DraftActionJobResponse>(`/api/drafts/${draftId}/rewrites`, {
        strategies: ["AUTHOR_VOICE", "DE_AI", "ORAL"],
        voiceProfileId: "default",
      });

      setActionMessage({
        tone: "success",
        text:
          payload.status === "QUEUED" ? "改写任务已进入队列，右侧会显示进度。" : "改写任务已启动。",
      });
      await refreshDetail();
    } catch (error: unknown) {
      setActionMessage({
        tone: "danger",
        text: error instanceof Error ? error.message : "触发改写失败。",
      });
    } finally {
      setIsTriggeringRewrite(false);
    }
  };

  const handleSelectRewrite = async (rewriteId: string): Promise<void> => {
    setPendingRewriteId(rewriteId);
    setActionMessage(null);

    try {
      const nextDetail = await postJson<DraftWorkbenchDetail>(
        `/api/drafts/${draftId}/select-rewrite`,
        {
          rewriteId,
        },
      );

      startTransition(() => {
        setDetail(nextDetail);
      });
      setActionMessage({
        tone: "success",
        text: "当前改写版本已切换，正文阅读区同步更新。",
      });
    } catch (error: unknown) {
      setActionMessage({
        tone: "danger",
        text: error instanceof Error ? error.message : "切换改写版本失败。",
      });
    } finally {
      setPendingRewriteId(null);
    }
  };

  const handleToggleChannel = (channel: string): void => {
    setSelectedChannels((current: string[]) => {
      if (current.includes(channel)) {
        return current.filter((item: string) => item !== channel);
      }

      return [...current, channel];
    });
  };

  const handlePackage = async (): Promise<void> => {
    setIsPackaging(true);
    setActionMessage(null);

    try {
      const payload = await postJson<DraftActionJobResponse>(`/api/drafts/${draftId}/package`, {
        channels: selectedChannels,
        rewriteId: detail.selectedRewrite?.id ?? null,
      });

      setActionMessage({
        tone: "success",
        text:
          payload.status === "QUEUED"
            ? "包装任务已排队，流程区会继续显示任务状态。"
            : "包装任务已开始执行。",
      });
      await refreshDetail();
    } catch (error: unknown) {
      setActionMessage({
        tone: "danger",
        text: error instanceof Error ? error.message : "触发包装失败。",
      });
    } finally {
      setIsPackaging(false);
    }
  };

  const compareSource = detail.selectedRewrite?.comparison;
  const readingBody = renderMarkdown(detail.readingPane.content);
  const baseBody = renderMarkdown(detail.basePane.content);

  return (
    <div className={styles.workbench}>
      <section className={styles.stage}>
        <div className={styles.stageBody}>
          <div className={styles.stageCluster}>
            <p className={styles.eyebrow}>Draft Workbench</p>
            <h1 className={styles.headline}>{detail.draft.title}</h1>
            <p className={styles.stageCopy}>{detail.draft.summary}</p>
          </div>

          <div className={styles.toolbar}>
            <span className={styles.metaPill} data-tone="accent">
              {detail.draft.draftTypeLabel}
            </span>
            <span className={styles.statusPill} data-tone={getStatusTone(detail.draft.status)}>
              {detail.draft.statusLabel}
            </span>
            <span className={styles.metaPill}>v{detail.draft.version}</span>
            <span className={styles.metaPill}>更新于 {formatDate(detail.draft.updatedAt)}</span>
            {hasRunningJobs ? (
              <span className={styles.metaPill} data-tone="accent">
                后台任务进行中
              </span>
            ) : null}
          </div>

          {renderNotices(detail.notices)}
        </div>

        <aside className={styles.stageAside}>
          <div className={styles.note}>
            <p className={styles.sectionLabel}>工作面权重</p>
            <ul className={styles.metaList}>
              <li>
                <span className={styles.metaLabel}>主区域</span>
                <span className={styles.metaValue}>阅读正文与判断是否值得继续推进</span>
              </li>
              <li>
                <span className={styles.metaLabel}>侧栏</span>
                <span className={styles.metaValue}>切换版本、确认当前选择、推进包装流程</span>
              </li>
              <li>
                <span className={styles.metaLabel}>当前阅读</span>
                <span className={styles.metaValue}>{detail.readingPane.label}</span>
              </li>
            </ul>
          </div>
        </aside>
      </section>

      {actionMessage ? (
        <div aria-live="polite" className={styles.actionMessage} data-tone={actionMessage.tone}>
          {actionMessage.text}
        </div>
      ) : null}

      <div className={styles.contentGrid}>
        <div className={styles.mainColumn}>
          {compareSource ? (
            <section className={styles.compareStrip}>
              <div>
                <p className={styles.sectionLabel}>版本判断</p>
                <p className={styles.metaCopy}>
                  当前选中版本与母稿的变化被压缩成三个判断点，不用先翻 diff 才知道这版改了什么。
                </p>
              </div>
              <div className={styles.compareGrid}>
                <article className={styles.compareBlock}>
                  <span className={styles.compareLabel}>开头变化</span>
                  <p>{compareSource.openingShift}</p>
                </article>
                <article className={styles.compareBlock}>
                  <span className={styles.compareLabel}>结构变化</span>
                  <p>{compareSource.structureShift}</p>
                </article>
                <article className={styles.compareBlock}>
                  <span className={styles.compareLabel}>收束变化</span>
                  <p>{compareSource.closeShift}</p>
                </article>
              </div>
            </section>
          ) : null}

          <article className={styles.readingSurface}>
            <div className={styles.readingMeta}>
              <span className={styles.readingLabel}>{detail.readingPane.label}</span>
              <h2 className={styles.readingTitle}>{detail.readingPane.title}</h2>
              {detail.readingPane.summary ? (
                <p className={styles.readingSummary}>{detail.readingPane.summary}</p>
              ) : null}
            </div>
            <div className={styles.readingBody}>{readingBody}</div>
          </article>

          <section className={styles.panel}>
            <p className={styles.sectionLabel}>母稿基线</p>
            <div className={styles.readingBody}>{baseBody}</div>
          </section>
        </div>

        <aside className={styles.sideColumn}>
          <section className={styles.asideSection}>
            <div className={styles.selectionCard}>
              <p className={styles.sectionLabel}>当前选择</p>
              {detail.selectedRewrite ? (
                <>
                  <h3 className={styles.selectionTitle}>{detail.selectedRewrite.title}</h3>
                  <p className={styles.metaCopy}>{detail.selectedRewrite.diffSummary}</p>
                  <ul className={styles.selectionFacts}>
                    <li className={styles.selectionFact}>
                      <span className={styles.metaLabel}>策略</span>
                      <span className={styles.metaValue}>
                        {detail.selectedRewrite.strategyLabel}
                      </span>
                    </li>
                    <li className={styles.selectionFact}>
                      <span className={styles.metaLabel}>评分</span>
                      <span className={styles.metaValue}>{detail.selectedRewrite.scoreLabel}</span>
                    </li>
                  </ul>
                </>
              ) : (
                <p className={styles.metaCopy}>还没有选中的改写版本。当前包装会回退到母稿正文。</p>
              )}
            </div>

            <div className={styles.panel}>
              <div className={styles.toolbar}>
                <p className={styles.sectionLabel}>改写版本</p>
                <button
                  className={styles.secondaryButton}
                  disabled={!detail.capabilities.canTriggerRewrite || isTriggeringRewrite}
                  onClick={() => {
                    void handleTriggerRewrite();
                  }}
                  type="button"
                >
                  {isTriggeringRewrite ? "生成中..." : "再生成一轮改写"}
                </button>
              </div>
              <p className={styles.packageHint}>
                列表优先服务快速比较：标题、策略、摘要和评分先于正文全文。
              </p>
              <div className={styles.rewriteList}>
                {detail.rewrites.length > 0 ? (
                  detail.rewrites.map((rewrite) => (
                    <article
                      className={styles.rewriteCard}
                      data-selected={rewrite.isSelected}
                      key={rewrite.id}
                    >
                      <button
                        className={styles.rewriteButton}
                        disabled={pendingRewriteId === rewrite.id}
                        onClick={() => {
                          void handleSelectRewrite(rewrite.id);
                        }}
                        type="button"
                      >
                        <div className={styles.rewriteCardHead}>
                          <div className={styles.rewriteMeta}>
                            <span className={styles.metaPill} data-tone="accent">
                              {rewrite.strategyLabel}
                            </span>
                            <span
                              className={styles.statusPill}
                              data-tone={rewrite.isSelected ? "accent" : "warning"}
                            >
                              {rewrite.isSelected ? "当前选择" : "点选切换"}
                            </span>
                          </div>
                          <span className={styles.metaPill}>{rewrite.scoreLabel}</span>
                        </div>
                        <div className={styles.rewriteBody}>
                          <h3 className={styles.rewriteTitle}>{rewrite.title}</h3>
                          <p className={styles.metaCopy}>{rewrite.diffSummary}</p>
                          <p className={styles.rewriteExcerpt}>{rewrite.openingExcerpt}</p>
                        </div>
                      </button>
                    </article>
                  ))
                ) : (
                  <div className={styles.emptyCard}>还没有改写版本，可以先触发一轮 mock 改写。</div>
                )}
              </div>
            </div>

            <div className={styles.packageStage}>
              <p className={styles.sectionLabel}>流程控制区</p>
              <div className={styles.flowRow}>
                <div className={styles.flowStep} data-state="active">
                  <span className={styles.flowStepLabel}>当前阅读</span>
                  <span className={styles.flowStepValue}>
                    {detail.selectedRewrite ? "改写版本" : "母稿正文"}
                  </span>
                </div>
                <div
                  className={styles.flowStep}
                  data-state={selectedChannels.length > 0 ? "active" : "idle"}
                >
                  <span className={styles.flowStepLabel}>目标渠道</span>
                  <span className={styles.flowStepValue}>{selectedChannels.length} 个</span>
                </div>
                <div
                  className={styles.flowStep}
                  data-state={detail.draft.status === "PACKAGED" ? "active" : "idle"}
                >
                  <span className={styles.flowStepLabel}>下一步</span>
                  <span className={styles.flowStepValue}>
                    {detail.draft.status === "PACKAGED" ? "可进审核" : "推进包装"}
                  </span>
                </div>
              </div>

              <p className={styles.packageHint}>
                Packaging
                是流程推进，不是工具按钮集合。它会基于当前选择版本，把渠道产物更新到同一条工作链上。
              </p>

              <div className={styles.packageChannels}>
                {["WECHAT", "XHS", "X_ARTICLE"].map((channel: string) => (
                  <label
                    className={styles.channelToggle}
                    data-selected={selectedChannels.includes(channel)}
                    key={channel}
                  >
                    <input
                      checked={selectedChannels.includes(channel)}
                      onChange={() => {
                        handleToggleChannel(channel);
                      }}
                      type="checkbox"
                    />
                    {channel === "WECHAT"
                      ? "微信公众号"
                      : channel === "XHS"
                        ? "小红书"
                        : "X Article"}
                  </label>
                ))}
              </div>

              <button
                className={styles.packageButton}
                disabled={
                  !detail.capabilities.canPackage || isPackaging || selectedChannels.length === 0
                }
                onClick={() => {
                  void handlePackage();
                }}
                type="button"
              >
                {isPackaging ? "正在提交包装任务..." : "推进到平台包装"}
              </button>
            </div>

            <div className={styles.jobPanel}>
              <p className={styles.sectionLabel}>任务状态</p>
              {detail.latestJob ? (
                <div className={styles.jobList}>
                  <article className={styles.jobListItem}>
                    <div className={styles.toolbar}>
                      <span className={styles.metaPill}>{detail.latestJob.label}</span>
                      <span
                        className={styles.statusPill}
                        data-tone={getStatusTone(detail.latestJob.status)}
                      >
                        {detail.latestJob.status}
                      </span>
                    </div>
                    <p className={styles.jobMeta}>
                      最近更新于 {formatDate(detail.latestJob.updatedAt)}
                      {isRefreshing ? " · 正在刷新" : ""}
                    </p>
                  </article>
                </div>
              ) : (
                <div className={styles.emptyCard}>还没有后台任务记录。</div>
              )}
            </div>

            <div className={styles.panel}>
              <p className={styles.sectionLabel}>渠道包装概览</p>
              <div className={styles.packageSummary}>
                {detail.packages.length > 0 ? (
                  detail.packages.map((publishPackage) => (
                    <article className={styles.packageRow} key={publishPackage.id}>
                      <div className={styles.toolbar}>
                        <span className={styles.channelChip} data-selected="true">
                          {publishPackage.channelLabel}
                        </span>
                        <span
                          className={styles.statusPill}
                          data-tone={getStatusTone(publishPackage.status)}
                        >
                          {publishPackage.statusLabel}
                        </span>
                      </div>
                      <p className={styles.jobMeta}>
                        更新于 {formatDate(publishPackage.updatedAt)}
                      </p>
                    </article>
                  ))
                ) : (
                  <div className={styles.emptyCard}>
                    当前还没有渠道包，适合从右上流程区直接推进。
                  </div>
                )}
              </div>
            </div>

            <div className={styles.note}>
              <p className={styles.sectionLabel}>其他稿件</p>
              <div className={styles.rewriteList}>
                {relatedDrafts
                  .filter((draft: DraftDirectoryItem) => draft.id !== draftId)
                  .map((draft: DraftDirectoryItem) => (
                    <Link
                      className={styles.directoryCard}
                      href={`/drafts/${draft.id}`}
                      key={draft.id}
                    >
                      <strong>{draft.title}</strong>
                      <span className={styles.jobMeta}>{draft.statusLabel}</span>
                    </Link>
                  ))}
              </div>
            </div>
          </section>
        </aside>
      </div>
    </div>
  );
}
