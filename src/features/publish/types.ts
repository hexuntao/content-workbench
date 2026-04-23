export type PublishActionJobResponse = {
  jobId: string;
  status: "QUEUED" | "RUNNING" | "SUCCEEDED" | "FAILED" | "CANCELED";
  publishPackageId: string;
  entityType: "PUBLISH_PACKAGE";
  entityId: string;
};

export type PublishPackageApiItem = {
  id: string;
  draftId: string;
  channel: string;
  status: string;
  title: string | null;
  summary: string | null;
  exportPath: string | null;
  draftUrl: string | null;
  updatedAt: string;
};

export type PublishPackageListResponse = {
  items: PublishPackageApiItem[];
  page: number;
  pageSize: number;
  total: number;
  pageCount: number;
};

export type PublishBoardItem = {
  id: string;
  draftId: string;
  title: string;
  summary: string | null;
  channel: string;
  channelLabel: string;
  status: string;
  statusLabel: string;
  reviewGate: "locked" | "ready" | "done";
  reviewGateLabel: string;
  nextActionLabel: string;
  updatedAt: string;
  exportPath: string | null;
  draftUrl: string | null;
  publishedUrl: string | null;
};

export type PublishBoardLane = {
  id: string;
  title: string;
  description: string;
  items: PublishBoardItem[];
};

export type PublishBoardSnapshot = {
  featuredPackageId: string | null;
  metrics: Array<{
    label: string;
    value: string;
    hint: string;
  }>;
  lanes: PublishBoardLane[];
};

export type PublishStage = {
  key: "export" | "remote-draft" | "published";
  label: string;
  state: "done" | "active" | "locked" | "failed";
  description: string;
  artifactLabel: string;
  artifactValue: string | null;
};

export type PublishCapabilitySet = {
  canExport: boolean;
  canCreateRemoteDraft: boolean;
  canMarkPublished: boolean;
  exportDisabledReason: string | null;
  remoteDraftDisabledReason: string | null;
  markPublishedDisabledReason: string | null;
};

export type PublishNotice = {
  tone: "info" | "success" | "warning" | "danger";
  title: string;
  description: string;
};

export type PublishJobItem = {
  id: string;
  label: string;
  status: string;
  updatedAt: string;
  errorCode: string | null;
  errorMessage: string | null;
};

export type PublishDetail = {
  package: {
    id: string;
    draftId: string;
    channel: string;
    channelLabel: string;
    title: string;
    summary: string | null;
    status: string;
    statusLabel: string;
    content: string;
    contentFormat: string;
    updatedAt: string;
  };
  draft: {
    id: string;
    title: string;
    status: string;
    statusLabel: string;
    reviewStatus: string | null;
    reviewStatusLabel: string | null;
  };
  stages: PublishStage[];
  capabilities: PublishCapabilitySet;
  notices: PublishNotice[];
  latestJob: PublishJobItem | null;
  jobs: PublishJobItem[];
  publication: {
    publishedUrl: string | null;
    publishedAt: string | null;
    notes: string | null;
  } | null;
};
