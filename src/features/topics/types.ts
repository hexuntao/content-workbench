export type TopicMasterDraftSummary = {
  id: string;
  title: string;
  status: string;
  updatedAt: string;
};

export type TopicListItem = {
  id: string;
  title: string;
  summary: string | null;
  keywords: string[];
  theme: string | null;
  trendScore: number;
  relevanceScore: number;
  editorialScore: number;
  totalScore: number;
  recommendedAngle: string | null;
  status: string;
  sourceItemCount: number;
  currentMasterDraft: TopicMasterDraftSummary | null;
  createdAt: string;
  updatedAt: string;
};

export type TopicListResponse = {
  items: TopicListItem[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
  };
};

export type TopicRelatedDraft = {
  id: string;
  draftType: string;
  status: string;
  title: string;
  summary: string | null;
  updatedAt: string;
};

export type TopicDetailResponse = {
  topic: TopicListItem & {
    metadata: unknown;
  };
  drafts: TopicRelatedDraft[];
};

export type TopicSourceItem = {
  id: string;
  title: string;
  url: string;
  author: string | null;
  publishedAt: string | null;
  summary: string | null;
  rank: number;
  reason: string | null;
};

export type TopicSourceItemsResponse = {
  items: TopicSourceItem[];
};

export type TopicActionResponse = {
  id: string;
  status: string;
};

export type TopicGenerateDraftResponse = {
  jobId: string;
  status: "QUEUED" | "RUNNING" | "SUCCEEDED" | "FAILED" | "CANCELED";
  topicId: string;
  entityType: "TOPIC_CLUSTER";
  entityId: string;
  idempotencyKey?: string;
};
