"use client";

import type { Route } from "next";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { startTransition, useDeferredValue, useEffect, useMemo, useState } from "react";

import { cx } from "@/lib/utils/cx";

import styles from "./topics-workbench.module.css";

type TopicStatus = "NEW" | "SHORTLISTED" | "IN_PROGRESS" | "IGNORED" | "ARCHIVED";
type DraftStatus = "QUEUED" | "DRAFTING" | "READY";
type SortOption = "TOTAL_SCORE" | "UPDATED_AT" | "SOURCE_ITEMS";
type ListPhase = "loading" | "ready";
type InspectorPhase = "idle" | "loading" | "ready" | "error";
type TopicAction = "shortlist" | "ignore" | "start" | "generate-master-draft";

type TopicSourceItem = {
  id: string;
  title: string;
  publisher: string;
  publishedAt: string;
  summary: string;
  reason: string;
  url: string;
};

type MasterDraftSummary = {
  id: string;
  title: string;
  status: DraftStatus;
  updatedAt: string;
};

type TopicRecord = {
  id: string;
  title: string;
  summary: string;
  theme: string;
  keywords: readonly string[];
  trendScore: number;
  relevanceScore: number;
  editorialScore: number;
  totalScore: number;
  status: TopicStatus;
  sourceItemCount: number;
  recommendedAngle: string;
  recommendationReason: string;
  writingSignal: string;
  densityNote: string;
  updatedAt: string;
  createdAt: string;
  currentMasterDraft: MasterDraftSummary | null;
  sources: readonly TopicSourceItem[];
  initialSourcePhase: "ready" | "error";
};

type TopicFilters = {
  status: TopicStatus | "ALL";
  theme: string | "ALL";
  sortBy: SortOption;
};

type ActionState = {
  topicId: string;
  action: TopicAction;
} | null;

type UndoState = {
  topic: TopicRecord;
} | null;

const LIST_LOADING_DELAY = 360;
const INSPECTOR_LOADING_DELAY = 320;
const ACTION_DELAY = 520;
const IGNORE_UNDO_WINDOW = 5000;

const initialTopics: TopicRecord[] = [
  {
    id: "topic-deepseek-ecosystem",
    title: "DeepSeek 新一轮开源动作，真正改变的是内容生产栈而不是参数表",
    summary:
      "来源聚焦的不只是模型能力，而是工具链、团队预算和内容流程如何随之重排。适合从工作台视角切入，而不是重复性能横评。",
    theme: "AI 工具",
    keywords: ["DeepSeek", "开源", "内容工作流", "模型生态"],
    trendScore: 0.91,
    relevanceScore: 0.88,
    editorialScore: 0.93,
    totalScore: 0.91,
    status: "NEW",
    sourceItemCount: 8,
    recommendedAngle: "从“内容团队为何重新分配写作与审核环节”切入，比参数对比更有读者意义。",
    recommendationReason: "多来源同时出现成本、速度和可控性信号，适合写成决策判断稿。",
    writingSignal: "高",
    densityNote: "来源分布横跨产品发布、开发者观察和一线使用笔记，交叉验证完整。",
    updatedAt: "2026-04-23T09:30:00.000Z",
    createdAt: "2026-04-22T18:00:00.000Z",
    currentMasterDraft: null,
    initialSourcePhase: "ready",
    sources: [
      {
        id: "src-deepseek-1",
        title: "DeepSeek 团队公布新一轮开放计划与调用策略",
        publisher: "官方博客",
        publishedAt: "2026-04-23T07:15:00.000Z",
        summary: "解释模型能力边界、开放接口范围和部署条件。",
        reason: "提供原始口径，适合校准标题与事实边界。",
        url: "https://example.com/deepseek-official",
      },
      {
        id: "src-deepseek-2",
        title: "内容团队为何在一周内重写 AI 选题 SOP",
        publisher: "Editorial Systems",
        publishedAt: "2026-04-23T05:20:00.000Z",
        summary: "三家内容团队分享模型升级后在选题、草稿和审核上的流程变化。",
        reason: "直接支撑“工作流重排”角度，而不是继续卷技术细节。",
        url: "https://example.com/editorial-systems",
      },
      {
        id: "src-deepseek-3",
        title: "开源模型成本曲线对商业内容团队意味着什么",
        publisher: "Infra Notes",
        publishedAt: "2026-04-22T22:40:00.000Z",
        summary: "从推理成本、并发量和部署维护成本分析团队采用门槛。",
        reason: "补齐商业层面的可写性判断。",
        url: "https://example.com/infra-notes",
      },
    ],
  },
  {
    id: "topic-briefing-rhythm",
    title: "每日 briefing 体系正在回归，问题不在生成速度而在编辑节奏",
    summary:
      "行业里重新出现高频 briefing 型内容，但真正可持续的团队都在调整选题密度、引用层次和审核门槛。",
    theme: "内容策略",
    keywords: ["briefing", "编辑节奏", "审核流程", "newsletter"],
    trendScore: 0.79,
    relevanceScore: 0.9,
    editorialScore: 0.89,
    totalScore: 0.86,
    status: "SHORTLISTED",
    sourceItemCount: 6,
    recommendedAngle:
      "把高频 briefing 拆成“信号筛选、判断写作、二次包装”三段，比写成工具清单更有结构。",
    recommendationReason: "来源集中讨论产能，但编辑价值差异更值得写。",
    writingSignal: "高",
    densityNote: "讨论密度高，观点相近，适合做结构化归纳而不是新闻汇编。",
    updatedAt: "2026-04-23T08:10:00.000Z",
    createdAt: "2026-04-22T13:20:00.000Z",
    currentMasterDraft: null,
    initialSourcePhase: "ready",
    sources: [
      {
        id: "src-briefing-1",
        title: "为什么 briefing 产品越多，真正值得读的越少",
        publisher: "Signal Desk",
        publishedAt: "2026-04-23T06:00:00.000Z",
        summary: "从读者疲劳和编辑门槛角度分析 briefing 泛滥。",
        reason: "点出内容密度问题，适合作为导语抓手。",
        url: "https://example.com/signal-desk",
      },
      {
        id: "src-briefing-2",
        title: "编辑团队如何把 briefing 变成长期栏目",
        publisher: "Inbox Craft",
        publishedAt: "2026-04-22T20:15:00.000Z",
        summary: "拆解选题筛选、引用规则和二次分发节奏。",
        reason: "支撑可执行写法，能直接进入提纲。",
        url: "https://example.com/inbox-craft",
      },
    ],
  },
  {
    id: "topic-multi-format-repackaging",
    title: "长文拆成播客、短帖与周报摘要，真正卡住团队的是选题母版而不是分发工具",
    summary: "多个案例都证明内容 repackaging 不是渠道问题，而是前置结构是否能支撑多次改写。",
    theme: "内容运营",
    keywords: ["repackaging", "内容母版", "分发", "播客"],
    trendScore: 0.75,
    relevanceScore: 0.84,
    editorialScore: 0.81,
    totalScore: 0.8,
    status: "IN_PROGRESS",
    sourceItemCount: 5,
    recommendedAngle: "围绕“先写母版，再做渠道变体”组织案例，会比工具对比文更稳。",
    recommendationReason: "已有明确主稿方向，可以直接推动生成母稿。",
    writingSignal: "中高",
    densityNote: "来源覆盖足够，但案例偏分散，适合用结构归纳降低跳跃感。",
    updatedAt: "2026-04-23T07:30:00.000Z",
    createdAt: "2026-04-22T09:50:00.000Z",
    currentMasterDraft: {
      id: "draft-781",
      title: "内容母版优先，而不是渠道优先",
      status: "DRAFTING",
      updatedAt: "2026-04-23T07:42:00.000Z",
    },
    initialSourcePhase: "ready",
    sources: [
      {
        id: "src-repackaging-1",
        title: "The editorial case for a master draft",
        publisher: "System Letters",
        publishedAt: "2026-04-22T16:45:00.000Z",
        summary: "通过三种团队案例说明母版稿如何减少渠道再加工成本。",
        reason: "最直接支撑生成 master draft 的价值。",
        url: "https://example.com/system-letters",
      },
      {
        id: "src-repackaging-2",
        title: "Podcast-first teams are quietly returning to written outlines",
        publisher: "Format Shift",
        publishedAt: "2026-04-22T11:18:00.000Z",
        summary: "播客团队重新依赖书面提纲，反推内容结构的可复用性。",
        reason: "补充跨媒介案例，让论证更完整。",
        url: "https://example.com/format-shift",
      },
      {
        id: "src-repackaging-3",
        title: "渠道工具越来越像，差距开始转移到编辑模版",
        publisher: "Operator Weekly",
        publishedAt: "2026-04-21T19:30:00.000Z",
        summary: "比较不同团队在复用模板上的表现差异。",
        reason: "可作为结尾判断，给出执行建议。",
        url: "https://example.com/operator-weekly",
      },
    ],
  },
  {
    id: "topic-searchless-discovery",
    title: "用户不再主动搜索内容，选题判断要迁移到被动发现链路",
    summary: "素材显示，内容消费越来越被 feed 和推荐驱动，旧式关键词选题法开始失真。",
    theme: "平台分发",
    keywords: ["发现机制", "feed", "推荐", "搜索"],
    trendScore: 0.82,
    relevanceScore: 0.78,
    editorialScore: 0.76,
    totalScore: 0.79,
    status: "NEW",
    sourceItemCount: 4,
    recommendedAngle: "不要写成‘SEO 已死’，而是写‘选题信号从搜索词迁移到行为链路’。",
    recommendationReason: "适合写判断稿，但证据链还需要更稳的来源排序。",
    writingSignal: "中",
    densityNote: "来源数量足够，结论偏强，最好先检查信号是否过度泛化。",
    updatedAt: "2026-04-22T23:35:00.000Z",
    createdAt: "2026-04-21T21:15:00.000Z",
    currentMasterDraft: null,
    initialSourcePhase: "error",
    sources: [
      {
        id: "src-discovery-1",
        title: "Search is shrinking inside creator workflows",
        publisher: "Attention Index",
        publishedAt: "2026-04-22T18:30:00.000Z",
        summary: "创作者流量分配中，搜索占比下降，推荐入口上升。",
        reason: "提供趋势背景，但还不够构成确定性结论。",
        url: "https://example.com/attention-index",
      },
      {
        id: "src-discovery-2",
        title: "内容团队如何追踪被动发现信号",
        publisher: "Feed Strategy",
        publishedAt: "2026-04-22T12:05:00.000Z",
        summary: "讨论从分享率、停留时间和平台转推看选题热度。",
        reason: "能补具体方法，但需要重试读取完整来源。",
        url: "https://example.com/feed-strategy",
      },
    ],
  },
  {
    id: "topic-evergreen-updates",
    title: "旧稿更新重新成为流量主力，值得写的是编辑台如何判断‘重写还是续写’",
    summary: "不是简单讲旧文翻新，而是判断哪些旧稿具有持续信号，哪些只适合轻量维护。",
    theme: "编辑流程",
    keywords: ["旧稿更新", "常青内容", "续写", "重写"],
    trendScore: 0.67,
    relevanceScore: 0.83,
    editorialScore: 0.8,
    totalScore: 0.77,
    status: "ARCHIVED",
    sourceItemCount: 3,
    recommendedAngle: "把“更新机制”写成编辑决策框架，而不是运营技巧列表。",
    recommendationReason: "方向成立，但本周已经被同题覆盖，留作后续归档参考。",
    writingSignal: "中",
    densityNote: "有方法论价值，但当前优先级不高。",
    updatedAt: "2026-04-22T19:40:00.000Z",
    createdAt: "2026-04-20T14:10:00.000Z",
    currentMasterDraft: {
      id: "draft-603",
      title: "旧稿更新的判断框架",
      status: "READY",
      updatedAt: "2026-04-22T20:05:00.000Z",
    },
    initialSourcePhase: "ready",
    sources: [
      {
        id: "src-evergreen-1",
        title: "Evergreen updates need stronger editorial gates",
        publisher: "Refresh Desk",
        publishedAt: "2026-04-21T11:30:00.000Z",
        summary: "说明为什么更新旧稿不是简单补数据。",
        reason: "适合做框架文章的背景段。",
        url: "https://example.com/refresh-desk",
      },
    ],
  },
  {
    id: "topic-community-questions",
    title: "社区问答回流到选题池，但很多问题只是流量，不是写作入口",
    summary: "表面上社区问题越来越多，真正值得写的是如何区分一次性求解和可延展的长期议题。",
    theme: "用户研究",
    keywords: ["社区问答", "选题池", "用户研究", "长期议题"],
    trendScore: 0.61,
    relevanceScore: 0.75,
    editorialScore: 0.74,
    totalScore: 0.71,
    status: "IGNORED",
    sourceItemCount: 2,
    recommendedAngle: "不是讲‘如何做社区’，而是讲‘哪些问题值得进入内容资产’。",
    recommendationReason: "判断逻辑有价值，但目前缺少足够强的素材支撑，暂时忽略。",
    writingSignal: "低",
    densityNote: "信号稀薄，暂不建议投入写作时间。",
    updatedAt: "2026-04-22T17:05:00.000Z",
    createdAt: "2026-04-20T10:25:00.000Z",
    currentMasterDraft: null,
    initialSourcePhase: "ready",
    sources: [],
  },
];

const statusOptions: ReadonlyArray<{ value: TopicFilters["status"]; label: string }> = [
  { value: "ALL", label: "全部状态" },
  { value: "NEW", label: "待判断" },
  { value: "SHORTLISTED", label: "已入选" },
  { value: "IN_PROGRESS", label: "写作中" },
  { value: "IGNORED", label: "已忽略" },
  { value: "ARCHIVED", label: "已归档" },
];

const sortOptions: ReadonlyArray<{ value: SortOption; label: string }> = [
  { value: "TOTAL_SCORE", label: "综合评分" },
  { value: "UPDATED_AT", label: "最近更新" },
  { value: "SOURCE_ITEMS", label: "来源密度" },
];

const defaultFilters: TopicFilters = {
  status: "ALL",
  theme: "ALL",
  sortBy: "TOTAL_SCORE",
};

function parseStatus(value: string | null): TopicFilters["status"] {
  return statusOptions.some((option) => option.value === value)
    ? (value as TopicFilters["status"])
    : defaultFilters.status;
}

function parseSort(value: string | null): SortOption {
  return sortOptions.some((option) => option.value === value)
    ? (value as SortOption)
    : defaultFilters.sortBy;
}

function formatPercent(value: number): string {
  return `${Math.round(value * 100)} 分`;
}

function formatDate(value: string): string {
  return new Intl.DateTimeFormat("zh-CN", {
    month: "numeric",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

function getStatusLabel(status: TopicStatus): string {
  switch (status) {
    case "NEW":
      return "待判断";
    case "SHORTLISTED":
      return "已入选";
    case "IN_PROGRESS":
      return "写作中";
    case "IGNORED":
      return "已忽略";
    case "ARCHIVED":
      return "已归档";
  }
}

function getNextActionLabel(topic: TopicRecord): string | null {
  if (topic.status === "IN_PROGRESS") {
    return "生成母稿";
  }

  if (topic.status === "NEW" || topic.status === "SHORTLISTED") {
    return "开始写作";
  }

  return null;
}

function matchesKeyword(topic: TopicRecord, keyword: string): boolean {
  if (!keyword) {
    return true;
  }

  const normalizedKeyword = keyword.toLowerCase();
  const haystacks = [
    topic.title,
    topic.summary,
    topic.theme,
    topic.recommendedAngle,
    ...topic.keywords,
  ];

  return haystacks.some((entry) => entry.toLowerCase().includes(normalizedKeyword));
}

function sortTopics(items: readonly TopicRecord[], sortBy: SortOption): TopicRecord[] {
  const nextItems = [...items];

  nextItems.sort((left, right) => {
    if (sortBy === "UPDATED_AT") {
      return new Date(right.updatedAt).getTime() - new Date(left.updatedAt).getTime();
    }

    if (sortBy === "SOURCE_ITEMS") {
      return right.sourceItemCount - left.sourceItemCount || right.totalScore - left.totalScore;
    }

    return right.totalScore - left.totalScore || right.editorialScore - left.editorialScore;
  });

  return nextItems;
}

function applyAction(topic: TopicRecord, action: TopicAction): TopicRecord {
  if (action === "shortlist") {
    return {
      ...topic,
      status: "SHORTLISTED",
    };
  }

  if (action === "ignore") {
    return {
      ...topic,
      status: "IGNORED",
    };
  }

  if (action === "start") {
    return {
      ...topic,
      status: "IN_PROGRESS",
    };
  }

  const nextDraft: MasterDraftSummary =
    topic.currentMasterDraft === null
      ? {
          id: `draft-${topic.id}`,
          title: `${topic.title} / 母稿`,
          status: "QUEUED",
          updatedAt: new Date().toISOString(),
        }
      : {
          ...topic.currentMasterDraft,
          status: "QUEUED",
          updatedAt: new Date().toISOString(),
        };

  return {
    ...topic,
    currentMasterDraft: nextDraft,
  };
}

function buildActionSet(topic: TopicRecord): readonly TopicAction[] {
  if (topic.status === "NEW") {
    return ["start", "shortlist", "ignore"];
  }

  if (topic.status === "SHORTLISTED") {
    return ["start", "ignore"];
  }

  if (topic.status === "IN_PROGRESS") {
    return ["generate-master-draft", "ignore"];
  }

  return [];
}

function getActionCopy(action: TopicAction): string {
  switch (action) {
    case "shortlist":
      return "加入 shortlist";
    case "ignore":
      return "忽略";
    case "start":
      return "开始写作";
    case "generate-master-draft":
      return "生成母稿";
  }
}

function getActionTone(action: TopicAction): "primary" | "secondary" | "ghost" {
  if (action === "generate-master-draft" || action === "start") {
    return "primary";
  }

  if (action === "shortlist") {
    return "secondary";
  }

  return "ghost";
}

function getThemeOptions(topics: readonly TopicRecord[]): ReadonlyArray<string> {
  return Array.from(new Set(topics.map((topic) => topic.theme))).sort((left, right) =>
    left.localeCompare(right, "zh-CN"),
  );
}

export function TopicsWorkbench(): React.JSX.Element {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [topics, setTopics] = useState<TopicRecord[]>(initialTopics);
  const [filters, setFilters] = useState<TopicFilters>(() => ({
    status: parseStatus(searchParams.get("status")),
    theme: searchParams.get("theme") ?? defaultFilters.theme,
    sortBy: parseSort(searchParams.get("sort")),
  }));
  const [rawKeyword, setRawKeyword] = useState<string>(() => searchParams.get("q") ?? "");
  const [selectedTopicId, setSelectedTopicId] = useState<string>(
    () => searchParams.get("topic") ?? initialTopics[0]?.id ?? "",
  );
  const [listPhase, setListPhase] = useState<ListPhase>("loading");
  const [inspectorPhase, setInspectorPhase] = useState<InspectorPhase>("idle");
  const [sourceRetries, setSourceRetries] = useState<Record<string, number>>({});
  const [actionState, setActionState] = useState<ActionState>(null);
  const [undoState, setUndoState] = useState<UndoState>(null);
  const [activityNote, setActivityNote] = useState<string>(
    "已按综合评分排序，优先展示最适合进入写作链路的 topic。",
  );

  const deferredKeyword = useDeferredValue(rawKeyword.trim());
  const themeOptions = useMemo(() => getThemeOptions(topics), [topics]);

  const visibleTopics = useMemo(() => {
    const filteredTopics = topics.filter((topic) => {
      const matchesStatus = filters.status === "ALL" ? true : topic.status === filters.status;
      const matchesTheme = filters.theme === "ALL" ? true : topic.theme === filters.theme;

      return matchesStatus && matchesTheme && matchesKeyword(topic, deferredKeyword);
    });

    return sortTopics(filteredTopics, filters.sortBy);
  }, [deferredKeyword, filters.sortBy, filters.status, filters.theme, topics]);

  const featuredTopics = (
    visibleTopics.filter((topic) => topic.totalScore >= 0.84).slice(0, 2).length > 0
      ? visibleTopics.filter((topic) => topic.totalScore >= 0.84).slice(0, 2)
      : visibleTopics.slice(0, 1)
  ).slice(0, 2);
  const ledgerTopics = visibleTopics.filter(
    (topic) => !featuredTopics.some((item) => item.id === topic.id),
  );
  const listRefreshTrigger = [
    filters.status,
    filters.theme,
    filters.sortBy,
    deferredKeyword || "no-keyword",
  ].join("|");
  const searchParamsString = searchParams.toString();

  const selectedTopic =
    visibleTopics.find((topic) => topic.id === selectedTopicId) ??
    featuredTopics[0] ??
    visibleTopics[0] ??
    null;

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      setListPhase("ready");
    }, LIST_LOADING_DELAY);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, []);

  useEffect(() => {
    const nextFilters: TopicFilters = {
      status: parseStatus(searchParams.get("status")),
      theme: searchParams.get("theme") ?? defaultFilters.theme,
      sortBy: parseSort(searchParams.get("sort")),
    };
    const nextKeyword = searchParams.get("q") ?? "";
    const nextTopicId = searchParams.get("topic") ?? initialTopics[0]?.id ?? "";

    setFilters((currentFilters) =>
      currentFilters.status === nextFilters.status &&
      currentFilters.theme === nextFilters.theme &&
      currentFilters.sortBy === nextFilters.sortBy
        ? currentFilters
        : nextFilters,
    );
    setRawKeyword((currentKeyword) =>
      currentKeyword === nextKeyword ? currentKeyword : nextKeyword,
    );
    setSelectedTopicId((currentTopicId) =>
      currentTopicId === nextTopicId ? currentTopicId : nextTopicId,
    );
  }, [searchParams]);

  useEffect(() => {
    if (!listRefreshTrigger) {
      return;
    }

    setListPhase("loading");

    const timeoutId = window.setTimeout(() => {
      setListPhase("ready");
    }, LIST_LOADING_DELAY);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [listRefreshTrigger]);

  useEffect(() => {
    if (visibleTopics.length === 0) {
      setSelectedTopicId("");
      return;
    }

    if (!visibleTopics.some((topic) => topic.id === selectedTopicId)) {
      setSelectedTopicId(visibleTopics[0].id);
    }
  }, [selectedTopicId, visibleTopics]);

  useEffect(() => {
    const nextParams = new URLSearchParams(searchParamsString);

    if (filters.status === defaultFilters.status) {
      nextParams.delete("status");
    } else {
      nextParams.set("status", filters.status);
    }

    if (filters.theme === defaultFilters.theme) {
      nextParams.delete("theme");
    } else {
      nextParams.set("theme", filters.theme);
    }

    if (filters.sortBy === defaultFilters.sortBy) {
      nextParams.delete("sort");
    } else {
      nextParams.set("sort", filters.sortBy);
    }

    if (deferredKeyword) {
      nextParams.set("q", deferredKeyword);
    } else {
      nextParams.delete("q");
    }

    if (selectedTopicId) {
      nextParams.set("topic", selectedTopicId);
    } else {
      nextParams.delete("topic");
    }

    const nextQuery = nextParams.toString();

    if (nextQuery !== searchParamsString) {
      const nextHref = (nextQuery ? `${pathname}?${nextQuery}` : pathname) as Route;

      router.replace(nextHref, {
        scroll: false,
      });
    }
  }, [
    deferredKeyword,
    filters.sortBy,
    filters.status,
    filters.theme,
    pathname,
    router,
    searchParamsString,
    selectedTopicId,
  ]);

  useEffect(() => {
    if (selectedTopic === null) {
      setInspectorPhase("idle");
      return;
    }

    setInspectorPhase("loading");

    const timeoutId = window.setTimeout(() => {
      const retryCount = sourceRetries[selectedTopic.id] ?? 0;
      const nextPhase =
        selectedTopic.initialSourcePhase === "error" && retryCount === 0 ? "error" : "ready";

      setInspectorPhase(nextPhase);
    }, INSPECTOR_LOADING_DELAY);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [selectedTopic, sourceRetries]);

  useEffect(() => {
    if (undoState === null) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      setUndoState(null);
    }, IGNORE_UNDO_WINDOW);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [undoState]);

  function updateFilters(nextFilters: Partial<TopicFilters>): void {
    startTransition(() => {
      setFilters((currentFilters) => ({
        ...currentFilters,
        ...nextFilters,
      }));
    });
  }

  function handleKeywordChange(value: string): void {
    startTransition(() => {
      setRawKeyword(value);
    });
  }

  function handleSelectTopic(topicId: string): void {
    startTransition(() => {
      setSelectedTopicId(topicId);
      setActivityNote("已切换右侧判断面板，来源与写作信号会在当前上下文内更新。");
    });
  }

  function handleFocusLeadTopics(): void {
    startTransition(() => {
      setFilters(defaultFilters);
      setRawKeyword("");
      setSelectedTopicId(initialTopics[0]?.id ?? "");
      setActivityNote("已回到推荐视图，优先展示最接近写作入口的 topics。");
    });
  }

  function handleClearFilters(): void {
    startTransition(() => {
      setFilters(defaultFilters);
      setRawKeyword("");
      setActivityNote("已清空筛选条件，topic ledger 恢复到默认判断视图。");
    });
  }

  function handleRetrySources(): void {
    if (selectedTopic === null) {
      return;
    }

    startTransition(() => {
      setSourceRetries((currentRetries) => ({
        ...currentRetries,
        [selectedTopic.id]: (currentRetries[selectedTopic.id] ?? 0) + 1,
      }));
      setActivityNote("正在重试读取来源摘要，右侧判断面板会保留当前 topic 上下文。");
    });
  }

  function handleAction(topicId: string, action: TopicAction): void {
    if (actionState !== null) {
      return;
    }

    setActionState({ topicId, action });
    setActivityNote(`${getActionCopy(action)} 已排入当前编辑动作。`);

    window.setTimeout(() => {
      startTransition(() => {
        let previousTopic: TopicRecord | null = null;

        setTopics((currentTopics) =>
          currentTopics.map((topic) => {
            if (topic.id !== topicId) {
              return topic;
            }

            previousTopic = topic;
            return applyAction(topic, action);
          }),
        );

        if (action === "ignore" && previousTopic !== null) {
          setUndoState({ topic: previousTopic });
        } else {
          setUndoState(null);
        }

        setActionState(null);
        setActivityNote(`已完成 ${getActionCopy(action)}，列表与判断面板已同步更新。`);
      });
    }, ACTION_DELAY);
  }

  function handleUndoIgnore(): void {
    if (undoState === null) {
      return;
    }

    startTransition(() => {
      setTopics((currentTopics) =>
        currentTopics.map((topic) => (topic.id === undoState.topic.id ? undoState.topic : topic)),
      );
      setSelectedTopicId(undoState.topic.id);
      setUndoState(null);
      setActivityNote("已撤销忽略动作，topic 已回到原先状态。");
    });
  }

  const filterSummary = [
    filters.status === "ALL" ? "全部状态" : getStatusLabel(filters.status),
    filters.theme === "ALL" ? "全部主题" : filters.theme,
    deferredKeyword ? `关键词：${deferredKeyword}` : "无关键词限制",
    sortOptions.find((option) => option.value === filters.sortBy)?.label ?? "综合评分",
  ];

  const shortlistCount = topics.filter((topic) => topic.status === "SHORTLISTED").length;
  const inProgressCount = topics.filter((topic) => topic.status === "IN_PROGRESS").length;

  return (
    <div className={styles.workbench}>
      <section className={styles.headerStage}>
        <div className={styles.headerLead}>
          <p className="kicker">线程 3 / Topics</p>
          <div className={styles.headerCopy}>
            <h2>选题编辑台</h2>
            <p>
              这里不把 topic 当成 CRUD
              记录，而是当成进入写作链路前的判断单元。先扫推荐理由、来源密度和可写性，再决定
              shortlist、start 或直接生成母稿。
            </p>
          </div>
          <div className={styles.headerActions}>
            <button className="button-link" onClick={handleFocusLeadTopics} type="button">
              聚焦推荐选题
            </button>
            <button
              className="button-link button-link--secondary"
              onClick={handleClearFilters}
              type="button"
            >
              清空筛选条件
            </button>
          </div>
        </div>

        <aside className={styles.headerRail}>
          <div className={styles.summaryCard}>
            <p className="meta-label">全局筛选摘要</p>
            <div className={styles.summaryChips}>
              {filterSummary.map((entry) => (
                <span className={styles.summaryChip} key={entry}>
                  {entry}
                </span>
              ))}
            </div>
          </div>

          <div className={styles.metricsRow}>
            <article className={styles.metricCard}>
              <span>推荐候选</span>
              <strong>{featuredTopics.length.toString().padStart(2, "0")}</strong>
            </article>
            <article className={styles.metricCard}>
              <span>Shortlist</span>
              <strong>{shortlistCount.toString().padStart(2, "0")}</strong>
            </article>
            <article className={styles.metricCard}>
              <span>写作中</span>
              <strong>{inProgressCount.toString().padStart(2, "0")}</strong>
            </article>
          </div>

          <div aria-live="polite" className={styles.liveRegion}>
            <p className={styles.activityNote}>{activityNote}</p>
            {undoState !== null ? (
              <div className={styles.undoNotice}>
                <p>{`已忽略「${undoState.topic.title}」，如果判断过快，现在可以撤销。`}</p>
                <button
                  className="button-link button-link--secondary"
                  onClick={handleUndoIgnore}
                  type="button"
                >
                  撤销忽略
                </button>
              </div>
            ) : null}
          </div>
        </aside>
      </section>

      <section className={styles.contentGrid}>
        <aside className={styles.filtersPanel}>
          <div className={styles.panelHeading}>
            <p className="meta-label">筛选控制</p>
            <h3>先缩小判断范围，再进入细读</h3>
          </div>

          <label className={styles.controlGroup}>
            <span>状态</span>
            <select
              autoComplete="off"
              className={styles.select}
              name="topic-status"
              onChange={(event) =>
                updateFilters({ status: event.target.value as TopicFilters["status"] })
              }
              value={filters.status}
            >
              {statusOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>

          <label className={styles.controlGroup}>
            <span>主题</span>
            <select
              autoComplete="off"
              className={styles.select}
              name="topic-theme"
              onChange={(event) => updateFilters({ theme: event.target.value })}
              value={filters.theme}
            >
              <option value="ALL">全部主题</option>
              {themeOptions.map((theme) => (
                <option key={theme} value={theme}>
                  {theme}
                </option>
              ))}
            </select>
          </label>

          <label className={styles.controlGroup}>
            <span>关键词</span>
            <input
              autoComplete="off"
              className={styles.searchInput}
              name="topic-keyword"
              onChange={(event) => handleKeywordChange(event.target.value)}
              placeholder="搜索标题、主题或推荐角度…"
              type="search"
              value={rawKeyword}
            />
          </label>

          <label className={styles.controlGroup}>
            <span>排序</span>
            <select
              autoComplete="off"
              className={styles.select}
              name="topic-sort"
              onChange={(event) => updateFilters({ sortBy: event.target.value as SortOption })}
              value={filters.sortBy}
            >
              {sortOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>

          <div className={styles.filterNote}>
            <p className="meta-label">当前规则</p>
            <p>推荐项优先按综合评分排序，其次看来源密度和最近更新时间。</p>
          </div>
        </aside>

        <div className={styles.mainColumn}>
          {listPhase === "loading" ? (
            <TopicListSkeleton />
          ) : visibleTopics.length === 0 ? (
            <section className={styles.emptyPanel}>
              <p className="meta-label">空结果</p>
              <h3>当前筛选下没有可判断的 topic</h3>
              <p>可以清空关键词，或者把状态切回“全部状态”，重新拉宽判断面。</p>
            </section>
          ) : (
            <>
              <section className={styles.leadPanel}>
                <div className={styles.panelHeading}>
                  <p className="meta-label">推荐选题</p>
                  <h3>先看最接近写作入口的 lead topics</h3>
                </div>

                <div className={styles.leadGrid}>
                  {featuredTopics.map((topic, index) => {
                    const isSelected = selectedTopic?.id === topic.id;
                    const pendingAction =
                      actionState?.topicId === topic.id ? actionState.action : null;

                    return (
                      <article
                        className={cx(styles.leadCard, isSelected && styles.leadCardSelected)}
                        key={topic.id}
                      >
                        <button
                          className={styles.leadCardButton}
                          onClick={() => handleSelectTopic(topic.id)}
                          type="button"
                        >
                          <div className={styles.leadCardHeader}>
                            <span className={styles.leadIndex}>{`0${index + 1}`}</span>
                            <span className={styles.statusBadge} data-status={topic.status}>
                              {getStatusLabel(topic.status)}
                            </span>
                          </div>

                          <div className={styles.leadCardBody}>
                            <h4>{topic.title}</h4>
                            <p>{topic.summary}</p>
                          </div>

                          <div className={styles.leadCardMeta}>
                            <div>
                              <span>推荐理由</span>
                              <strong>{topic.recommendationReason}</strong>
                            </div>
                            <div>
                              <span>可写性</span>
                              <strong>{topic.writingSignal}</strong>
                            </div>
                            <div>
                              <span>来源密度</span>
                              <strong>{`${topic.sourceItemCount} 条`}</strong>
                            </div>
                          </div>
                        </button>

                        <div className={styles.actionCluster}>
                          {buildActionSet(topic).map((action) => (
                            <TopicActionButton
                              action={action}
                              isPending={pendingAction === action}
                              key={action}
                              onClick={() => handleAction(topic.id, action)}
                              tone={getActionTone(action)}
                            />
                          ))}
                        </div>
                      </article>
                    );
                  })}
                </div>
              </section>

              <section className={styles.ledgerPanel}>
                <div className={styles.panelHeading}>
                  <p className="meta-label">Topic Ledger</p>
                  <h3>其余选题按判断信号压缩到行式总账里</h3>
                </div>

                <div className={styles.ledgerList}>
                  {ledgerTopics.map((topic) => {
                    const isSelected = selectedTopic?.id === topic.id;
                    const pendingAction =
                      actionState?.topicId === topic.id ? actionState.action : null;
                    const nextActionLabel = getNextActionLabel(topic);

                    return (
                      <article
                        className={cx(styles.ledgerRow, isSelected && styles.ledgerRowSelected)}
                        key={topic.id}
                      >
                        <button
                          className={styles.ledgerSelect}
                          onClick={() => handleSelectTopic(topic.id)}
                          type="button"
                        >
                          <div className={styles.ledgerMain}>
                            <div className={styles.ledgerHeading}>
                              <span className={styles.statusBadge} data-status={topic.status}>
                                {getStatusLabel(topic.status)}
                              </span>
                              <span className={styles.themeBadge}>{topic.theme}</span>
                            </div>

                            <h4>{topic.title}</h4>
                            <p>{topic.summary}</p>
                          </div>

                          <dl className={styles.ledgerStats}>
                            <div>
                              <dt>推荐角度</dt>
                              <dd>{topic.recommendedAngle}</dd>
                            </div>
                            <div>
                              <dt>评分</dt>
                              <dd>{formatPercent(topic.totalScore)}</dd>
                            </div>
                            <div>
                              <dt>来源</dt>
                              <dd>{`${topic.sourceItemCount} 条`}</dd>
                            </div>
                            <div>
                              <dt>下一步</dt>
                              <dd>{nextActionLabel ?? "只读"}</dd>
                            </div>
                          </dl>
                        </button>

                        <div className={styles.inlineActions}>
                          {buildActionSet(topic).length > 0 ? (
                            buildActionSet(topic).map((action) => (
                              <TopicActionButton
                                action={action}
                                isPending={pendingAction === action}
                                key={action}
                                onClick={() => handleAction(topic.id, action)}
                                tone={getActionTone(action)}
                              />
                            ))
                          ) : (
                            <span className={styles.readOnlyNote}>当前状态仅供查看</span>
                          )}
                        </div>
                      </article>
                    );
                  })}
                </div>
              </section>
            </>
          )}
        </div>

        <aside className={styles.inspectorPanel}>
          {selectedTopic === null ? (
            <section className={styles.emptyPanel}>
              <p className="meta-label">详情面板</p>
              <h3>先从列表中选择一个 topic</h3>
              <p>右侧会显示评分分布、推荐理由、来源摘要和当前动作。</p>
            </section>
          ) : (
            <TopicInspector
              actionState={actionState}
              inspectorPhase={inspectorPhase}
              onAction={handleAction}
              onRetrySources={handleRetrySources}
              topic={selectedTopic}
            />
          )}
        </aside>
      </section>
    </div>
  );
}

type TopicActionButtonProps = {
  action: TopicAction;
  tone: "primary" | "secondary" | "ghost";
  isPending: boolean;
  onClick: () => void;
};

function TopicActionButton({
  action,
  tone,
  isPending,
  onClick,
}: TopicActionButtonProps): React.JSX.Element {
  return (
    <button
      className={cx(
        styles.actionButton,
        tone === "primary" && styles.actionButtonPrimary,
        tone === "secondary" && styles.actionButtonSecondary,
        tone === "ghost" && styles.actionButtonGhost,
      )}
      disabled={isPending}
      onClick={onClick}
      type="button"
    >
      {isPending ? "处理中…" : getActionCopy(action)}
    </button>
  );
}

type TopicInspectorProps = {
  topic: TopicRecord;
  inspectorPhase: InspectorPhase;
  actionState: ActionState;
  onRetrySources: () => void;
  onAction: (topicId: string, action: TopicAction) => void;
};

function TopicInspector({
  topic,
  inspectorPhase,
  actionState,
  onRetrySources,
  onAction,
}: TopicInspectorProps): React.JSX.Element {
  const pendingAction = actionState?.topicId === topic.id ? actionState.action : null;

  return (
    <section className={styles.inspectorCard}>
      <div className={styles.inspectorHeader}>
        <div className={styles.panelHeading}>
          <p className="meta-label">判断面板</p>
          <h3>{topic.title}</h3>
        </div>
        <div className={styles.inspectorMeta}>
          <span className={styles.statusBadge} data-status={topic.status}>
            {getStatusLabel(topic.status)}
          </span>
          <span className={styles.themeBadge}>{topic.theme}</span>
          <span className={styles.timestamp}>{`更新于 ${formatDate(topic.updatedAt)}`}</span>
        </div>
      </div>

      <div className={styles.angleBlock}>
        <span>推荐角度</span>
        <p>{topic.recommendedAngle}</p>
      </div>

      <div className={styles.scoreGrid}>
        <ScoreBlock label="综合评分" value={topic.totalScore} />
        <ScoreBlock label="热度信号" value={topic.trendScore} />
        <ScoreBlock label="相关度" value={topic.relevanceScore} />
        <ScoreBlock label="编辑价值" value={topic.editorialScore} />
      </div>

      <div className={styles.inspectorNotes}>
        <article className={styles.noteBlock}>
          <span>推荐理由</span>
          <p>{topic.recommendationReason}</p>
        </article>
        <article className={styles.noteBlock}>
          <span>来源密度</span>
          <p>{topic.densityNote}</p>
        </article>
        <article className={styles.noteBlock}>
          <span>可写性判断</span>
          <p>{`当前信号：${topic.writingSignal}。${topic.summary}`}</p>
        </article>
      </div>

      <div className={styles.inspectorActions}>
        {buildActionSet(topic).length > 0 ? (
          buildActionSet(topic).map((action) => (
            <TopicActionButton
              action={action}
              isPending={pendingAction === action}
              key={action}
              onClick={() => onAction(topic.id, action)}
              tone={getActionTone(action)}
            />
          ))
        ) : (
          <span className={styles.readOnlyNote}>当前 topic 只保留查看上下文。</span>
        )}
      </div>

      {topic.currentMasterDraft !== null ? (
        <div className={styles.draftCard}>
          <p className="meta-label">当前母稿</p>
          <strong>{topic.currentMasterDraft.title}</strong>
          <div className={styles.draftMeta}>
            <span>{topic.currentMasterDraft.status}</span>
            <span>{formatDate(topic.currentMasterDraft.updatedAt)}</span>
          </div>
        </div>
      ) : null}

      <section className={styles.sourcesSection}>
        <div className={styles.panelHeading}>
          <p className="meta-label">Source Items</p>
          <h3>{`${topic.sourceItemCount} 条来源，服务于快速判断而不是原始堆叠`}</h3>
        </div>

        {inspectorPhase === "loading" ? (
          <div className={styles.sourceSkeleton} aria-hidden="true">
            <span />
            <span />
            <span />
          </div>
        ) : inspectorPhase === "error" ? (
          <div className={styles.errorPanel}>
            <p>来源摘要暂时读取失败。可以先重试读取来源，再决定这条 topic 是否值得进入写作链路。</p>
            <button
              className="button-link button-link--secondary"
              onClick={onRetrySources}
              type="button"
            >
              重试读取来源
            </button>
          </div>
        ) : topic.sources.length === 0 ? (
          <div className={styles.emptyInline}>
            <p>当前没有可展示的来源摘要，这个 topic 更适合作为备选而不是立即开写。</p>
          </div>
        ) : (
          <div className={styles.sourceList}>
            {topic.sources.map((source, index) => (
              <article className={styles.sourceRow} key={source.id}>
                <div className={styles.sourceRowHeader}>
                  <span className={styles.sourceRank}>{`0${index + 1}`}</span>
                  <div>
                    <strong>{source.title}</strong>
                    <p>{`${source.publisher} · ${formatDate(source.publishedAt)}`}</p>
                  </div>
                </div>
                <p className={styles.sourceSummary}>{source.summary}</p>
                <div className={styles.sourceReason}>
                  <span>为何值得看</span>
                  <p>{source.reason}</p>
                </div>
                <a href={source.url} rel="noreferrer" target="_blank">
                  查看原始来源
                </a>
              </article>
            ))}
          </div>
        )}
      </section>
    </section>
  );
}

type ScoreBlockProps = {
  label: string;
  value: number;
};

function ScoreBlock({ label, value }: ScoreBlockProps): React.JSX.Element {
  return (
    <article className={styles.scoreBlock}>
      <span>{label}</span>
      <strong>{formatPercent(value)}</strong>
      <div className={styles.scoreTrack} aria-hidden="true">
        <span style={{ width: `${Math.round(value * 100)}%` }} />
      </div>
    </article>
  );
}

function TopicListSkeleton(): React.JSX.Element {
  const leadSkeletonKeys = ["lead-a", "lead-b"] as const;
  const rowSkeletonKeys = ["row-a", "row-b", "row-c", "row-d"] as const;

  return (
    <div className={styles.skeletonStack} aria-hidden="true">
      <section className={styles.leadPanel}>
        <div className={styles.panelHeading}>
          <p className="meta-label">推荐选题</p>
          <h3>正在整理 lead topics…</h3>
        </div>
        <div className={styles.leadGrid}>
          {leadSkeletonKeys.map((key) => (
            <div className={styles.skeletonCard} key={key}>
              <span />
              <span />
              <span />
            </div>
          ))}
        </div>
      </section>
      <section className={styles.ledgerPanel}>
        <div className={styles.panelHeading}>
          <p className="meta-label">Topic Ledger</p>
          <h3>正在回填列表…</h3>
        </div>
        <div className={styles.skeletonLedger}>
          {rowSkeletonKeys.map((key) => (
            <div className={styles.skeletonRow} key={key}>
              <span />
              <span />
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
