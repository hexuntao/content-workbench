"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { startTransition, useDeferredValue, useEffect, useEffectEvent, useState } from "react";
import styles from "@/features/topics/components/topics-workbench.module.css";
import type {
  TopicActionResponse,
  TopicDetailResponse,
  TopicGenerateDraftResponse,
  TopicListResponse,
  TopicSourceItemsResponse,
} from "@/features/topics/types";

type TopicsWorkbenchProps = {
  initialList: TopicListResponse;
  initialDetail: TopicDetailResponse | null;
  initialSourceItems: TopicSourceItemsResponse;
};

type FeedbackState = {
  tone: "success" | "danger";
  text: string;
} | null;

type TopicAction = "shortlist" | "ignore" | "start" | "generate-master-draft";

type TopicFilters = {
  status: string;
  theme: string;
  keyword: string;
  sortBy: "totalScore" | "updatedAt" | "createdAt";
};

async function readJson<T>(input: RequestInfo, init?: RequestInit): Promise<T> {
  const response = await fetch(input, init);
  const body = (await response.json()) as
    | T
    | {
        error?: {
          message?: string;
        };
      };

  if (!response.ok) {
    throw new Error(
      typeof body === "object" && body !== null && "error" in body && body.error?.message
        ? body.error.message
        : "Request failed.",
    );
  }

  return body as T;
}

export function TopicsWorkbench({
  initialList,
  initialDetail,
  initialSourceItems,
}: TopicsWorkbenchProps): React.JSX.Element {
  const router = useRouter();
  const [list, setList] = useState<TopicListResponse>(initialList);
  const [detail, setDetail] = useState<TopicDetailResponse | null>(initialDetail);
  const [sourceItems, setSourceItems] = useState<TopicSourceItemsResponse>(initialSourceItems);
  const [filters, setFilters] = useState<TopicFilters>({
    status: "",
    theme: "",
    keyword: "",
    sortBy: "totalScore",
  });
  const [isLoadingList, setIsLoadingList] = useState(false);
  const [isLoadingDetail, setIsLoadingDetail] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<FeedbackState>(null);

  const deferredKeyword = useDeferredValue(filters.keyword.trim());
  const selectedTopicId = detail?.topic.id ?? list.items[0]?.id ?? null;

  const refreshSelectedTopic = useEffectEvent(async (topicId: string): Promise<void> => {
    setIsLoadingDetail(true);

    try {
      const [nextDetail, nextSources] = await Promise.all([
        readJson<TopicDetailResponse>(`/api/topics/${topicId}`),
        readJson<TopicSourceItemsResponse>(`/api/topics/${topicId}/source-items`),
      ]);

      setDetail(nextDetail);
      setSourceItems(nextSources);
    } finally {
      setIsLoadingDetail(false);
    }
  });

  useEffect(() => {
    const query = new URLSearchParams();

    if (filters.status) {
      query.set("status", filters.status);
    }

    if (filters.theme) {
      query.set("theme", filters.theme);
    }

    if (deferredKeyword) {
      query.set("keyword", deferredKeyword);
    }

    query.set("sortBy", filters.sortBy);

    let cancelled = false;
    setIsLoadingList(true);

    void readJson<TopicListResponse>(`/api/topics?${query.toString()}`)
      .then((nextList) => {
        if (cancelled) {
          return;
        }

        setList(nextList);

        const nextSelectedTopicId =
          nextList.items.find((item) => item.id === selectedTopicId)?.id ??
          nextList.items[0]?.id ??
          null;

        if (nextSelectedTopicId) {
          void refreshSelectedTopic(nextSelectedTopicId);
        } else {
          setDetail(null);
          setSourceItems({
            items: [],
          });
        }
      })
      .catch((error: unknown) => {
        if (cancelled) {
          return;
        }

        setFeedback({
          tone: "danger",
          text: error instanceof Error ? error.message : "加载 topics 失败。",
        });
      })
      .finally(() => {
        if (!cancelled) {
          setIsLoadingList(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [deferredKeyword, filters.sortBy, filters.status, filters.theme, selectedTopicId]);

  const handleSelectTopic = useEffectEvent(async (topicId: string): Promise<void> => {
    await refreshSelectedTopic(topicId);
  });

  const handleAction = useEffectEvent(async (action: TopicAction): Promise<void> => {
    if (selectedTopicId === null) {
      return;
    }

    setIsSubmitting(true);
    setFeedback(null);

    try {
      if (action === "generate-master-draft") {
        const response = await readJson<TopicGenerateDraftResponse>(
          `/api/topics/${selectedTopicId}/generate-master-draft`,
          {
            method: "POST",
            headers: {
              "content-type": "application/json",
            },
            body: JSON.stringify({
              voiceProfileId: "default",
            }),
          },
        );

        setFeedback({
          tone: "success",
          text: `母稿任务已入队：${response.jobId}`,
        });
        await new Promise<void>((resolve) => {
          setTimeout(resolve, 350);
        });
      } else {
        const endpoint =
          action === "shortlist"
            ? `/api/topics/${selectedTopicId}/shortlist`
            : action === "ignore"
              ? `/api/topics/${selectedTopicId}/ignore`
              : `/api/topics/${selectedTopicId}/start`;

        await readJson<TopicActionResponse>(endpoint, {
          method: "POST",
          headers: {
            "content-type": "application/json",
          },
          body:
            action === "ignore"
              ? JSON.stringify({
                  reason: "暂不进入本轮写作窗口",
                })
              : JSON.stringify({}),
        });

        setFeedback({
          tone: "success",
          text:
            action === "shortlist"
              ? "已加入 shortlist。"
              : action === "ignore"
                ? "该 topic 已忽略。"
                : "该 topic 已进入写作链路。",
        });
      }

      const query = new URLSearchParams();

      if (filters.status) {
        query.set("status", filters.status);
      }

      if (filters.theme) {
        query.set("theme", filters.theme);
      }

      if (deferredKeyword) {
        query.set("keyword", deferredKeyword);
      }

      query.set("sortBy", filters.sortBy);

      const nextList = await readJson<TopicListResponse>(`/api/topics?${query.toString()}`);
      setList(nextList);
      await refreshSelectedTopic(selectedTopicId);
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
  });

  const themeOptions = Array.from(
    new Set(
      list.items.map((item) => item.theme).filter((theme): theme is string => Boolean(theme)),
    ),
  ).sort((left, right) => left.localeCompare(right, "zh-CN"));

  return (
    <div className={styles.page}>
      <section className={styles.header}>
        <div>
          <p>Topics</p>
          <h1>选题池与主链路入口</h1>
          <p>这里直接读取 `TopicCluster`，并通过真实 API 推进 shortlist、start 与母稿生成。</p>
        </div>

        <div className={styles.filters}>
          <select
            className={styles.select}
            onChange={(event) => {
              setFilters((current) => ({
                ...current,
                status: event.target.value,
              }));
            }}
            value={filters.status}
          >
            <option value="">全部状态</option>
            <option value="NEW">NEW</option>
            <option value="SHORTLISTED">SHORTLISTED</option>
            <option value="IN_PROGRESS">IN_PROGRESS</option>
            <option value="IGNORED">IGNORED</option>
            <option value="ARCHIVED">ARCHIVED</option>
          </select>
          <select
            className={styles.select}
            onChange={(event) => {
              setFilters((current) => ({
                ...current,
                theme: event.target.value,
              }));
            }}
            value={filters.theme}
          >
            <option value="">全部主题</option>
            {themeOptions.map((theme) => (
              <option key={theme} value={theme}>
                {theme}
              </option>
            ))}
          </select>
          <input
            className={styles.input}
            onChange={(event) => {
              setFilters((current) => ({
                ...current,
                keyword: event.target.value,
              }));
            }}
            placeholder="关键词"
            value={filters.keyword}
          />
          <select
            className={styles.select}
            onChange={(event) => {
              setFilters((current) => ({
                ...current,
                sortBy: event.target.value as TopicFilters["sortBy"],
              }));
            }}
            value={filters.sortBy}
          >
            <option value="totalScore">按总分</option>
            <option value="updatedAt">按更新时间</option>
            <option value="createdAt">按创建时间</option>
          </select>
        </div>
      </section>

      {feedback ? (
        <div className={styles.feedback} data-tone={feedback.tone}>
          {feedback.text}
        </div>
      ) : null}

      <div className={styles.layout}>
        <section className={styles.panel}>
          <div className={styles.metaRow}>
            <h2>Topic List</h2>
            <span className={styles.pill}>
              {isLoadingList ? "加载中" : `${list.pagination.total} 条`}
            </span>
          </div>

          <div className={styles.topicList}>
            {list.items.length > 0 ? (
              list.items.map((item) => (
                <button
                  className={styles.topicCard}
                  data-active={item.id === selectedTopicId}
                  key={item.id}
                  onClick={() => {
                    void handleSelectTopic(item.id);
                  }}
                  type="button"
                >
                  <div className={styles.metaRow}>
                    <strong>{item.title}</strong>
                    <span className={styles.pill}>{item.status}</span>
                  </div>
                  <p>{item.summary ?? "暂无摘要。"}</p>
                  <div className={styles.metaRow}>
                    <span className={styles.pill}>{item.theme ?? "未分类"}</span>
                    <span className={styles.pill}>source {item.sourceItemCount}</span>
                    <span className={styles.pill}>score {item.totalScore.toFixed(2)}</span>
                  </div>
                </button>
              ))
            ) : (
              <div className={styles.empty}>当前没有符合条件的 topics。</div>
            )}
          </div>
        </section>

        <section className={styles.panel}>
          {detail ? (
            <div className={styles.detailGrid}>
              <div>
                <div className={styles.metaRow}>
                  <h2>{detail.topic.title}</h2>
                  <span className={styles.pill}>
                    {isLoadingDetail ? "同步中" : detail.topic.status}
                  </span>
                </div>
                <p>{detail.topic.summary ?? "暂无摘要。"}</p>
                <div className={styles.metaRow}>
                  {detail.topic.keywords.map((keyword) => (
                    <span className={styles.pill} key={keyword}>
                      {keyword}
                    </span>
                  ))}
                </div>
              </div>

              <div className={styles.actions}>
                <button
                  className={styles.buttonSecondary}
                  disabled={isSubmitting}
                  onClick={() => {
                    void handleAction("shortlist");
                  }}
                  type="button"
                >
                  Shortlist
                </button>
                <button
                  className={styles.button}
                  disabled={isSubmitting}
                  onClick={() => {
                    void handleAction("start");
                  }}
                  type="button"
                >
                  Start
                </button>
                <button
                  className={styles.button}
                  disabled={isSubmitting}
                  onClick={() => {
                    void handleAction("generate-master-draft");
                  }}
                  type="button"
                >
                  Generate Master Draft
                </button>
                <button
                  className={styles.buttonGhost}
                  disabled={isSubmitting}
                  onClick={() => {
                    void handleAction("ignore");
                  }}
                  type="button"
                >
                  Ignore
                </button>
              </div>

              <div className={styles.panel}>
                <div className={styles.metaRow}>
                  <h3>当前稿件</h3>
                  {detail.topic.currentMasterDraft ? (
                    <Link href={`/drafts/${detail.topic.currentMasterDraft.id}`}>打开母稿</Link>
                  ) : null}
                </div>
                {detail.drafts.length > 0 ? (
                  detail.drafts.map((draft) => (
                    <div className={styles.sourceCard} key={draft.id}>
                      <div className={styles.metaRow}>
                        <strong>{draft.title}</strong>
                        <span className={styles.pill}>{draft.status}</span>
                        <span className={styles.pill}>{draft.draftType}</span>
                      </div>
                      <p>{draft.summary ?? "暂无摘要。"}</p>
                      <Link href={`/drafts/${draft.id}`}>查看 Draft</Link>
                    </div>
                  ))
                ) : (
                  <div className={styles.empty}>当前选题还没有落地稿件。</div>
                )}
              </div>

              <div className={styles.panel}>
                <div className={styles.metaRow}>
                  <h3>关联素材</h3>
                  <span className={styles.pill}>{sourceItems.items.length} 条</span>
                </div>
                <div className={styles.sourceList}>
                  {sourceItems.items.map((item) => (
                    <article className={styles.sourceCard} key={item.id}>
                      <div className={styles.metaRow}>
                        <strong>{item.title}</strong>
                        <span className={styles.pill}>rank {item.rank}</span>
                      </div>
                      <p>{item.summary ?? "暂无摘要。"}</p>
                      <a href={item.url} rel="noreferrer" target="_blank">
                        来源链接
                      </a>
                    </article>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div className={styles.empty}>请选择一个 topic。</div>
          )}
        </section>
      </div>
    </div>
  );
}
