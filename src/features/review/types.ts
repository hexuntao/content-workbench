export type ReviewChecklistState = {
  factsChecked: boolean;
  argumentClear: boolean;
  voiceConsistent: boolean;
  channelReady: boolean;
  aiClicheFree: boolean;
};

export type ReviewChecklistKey = keyof ReviewChecklistState;

export type ReviewChecklistItem = {
  key: ReviewChecklistKey;
  label: string;
  description: string;
  checked: boolean;
};

export type ReviewTaskApiItem = {
  id: string;
  draftId: string;
  reviewerEmail: string | null;
  status: string;
  checklist: ReviewChecklistState | null;
  comments: string | null;
  decidedAt: string | null;
  createdAt: string;
  updatedAt: string;
  draft: {
    id: string;
    title: string;
    status: string;
    currentRewriteId: string | null;
  };
};

export type ReviewTaskListResponse = {
  items: ReviewTaskApiItem[];
  page: number;
  pageSize: number;
  total: number;
  pageCount: number;
};

export type ReviewQueueItem = {
  id: string;
  draftId: string;
  title: string;
  summary: string | null;
  reviewerEmail: string | null;
  status: string;
  statusLabel: string;
  priorityBand: "critical" | "active" | "resolved";
  priorityLabel: string;
  queueLabel: string;
  decisionFocus: string;
  channelCount: number;
  historyCount: number;
  currentRewriteTitle: string | null;
  createdAt: string;
  updatedAt: string;
};

export type ReviewQueueLane = {
  id: string;
  title: string;
  description: string;
  count: number;
  items: ReviewQueueItem[];
};

export type ReviewMetric = {
  label: string;
  value: string;
  hint: string;
};

export type ReviewQueueSnapshot = {
  featuredTaskId: string | null;
  totals: {
    pending: number;
    changesRequested: number;
    approved: number;
  };
  metrics: ReviewMetric[];
  lanes: ReviewQueueLane[];
};

export type ReviewHistoryItem = {
  id: string;
  status: string;
  statusLabel: string;
  reviewerEmail: string | null;
  comments: string | null;
  createdAt: string;
  decidedAt: string | null;
  contextNote: string;
};

export type ReviewPackageSummary = {
  id: string;
  channel: string;
  channelLabel: string;
  status: string;
  statusLabel: string;
};

export type ReviewDecisionCapabilities = {
  canApprove: boolean;
  canRequestChanges: boolean;
  canResubmit: boolean;
  disabledReason: string | null;
};

export type ReviewDecisionPanel = {
  primaryLabel: string;
  secondaryLabel: string;
  riskLabel: string;
  guidance: string;
};

export type ReviewNotice = {
  tone: "info" | "success" | "warning" | "danger";
  title: string;
  description: string;
};

export type ReviewDetail = {
  task: {
    id: string;
    draftId: string;
    reviewerEmail: string | null;
    status: string;
    statusLabel: string;
    createdAt: string;
    updatedAt: string;
    decidedAt: string | null;
  };
  draft: {
    id: string;
    title: string;
    summary: string | null;
    status: string;
    statusLabel: string;
    draftTypeLabel: string;
    currentRewriteId: string | null;
    currentRewriteTitle: string | null;
    content: string;
    contentFormat: string;
    selectedLabel: string;
  };
  checklist: {
    completionLabel: string;
    items: ReviewChecklistItem[];
  };
  comments: string | null;
  publishPackages: ReviewPackageSummary[];
  history: ReviewHistoryItem[];
  capabilities: ReviewDecisionCapabilities;
  decision: ReviewDecisionPanel;
  notices: ReviewNotice[];
};

export type ReviewDecisionInput = {
  comments: string;
  checklist: ReviewChecklistState;
};

export type ResubmitReviewInput = {
  draftId: string;
  newRewriteId: string | null;
};
