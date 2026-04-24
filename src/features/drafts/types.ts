export type WorkbenchJobStatus = "QUEUED" | "RUNNING" | "SUCCEEDED" | "FAILED" | "CANCELED";

export type DraftWorkbenchAction = "TRIGGER_REWRITE" | "SELECT_REWRITE" | "PACKAGE_DRAFT";

export type DraftWorkbenchNoticeTone = "info" | "success" | "warning" | "danger";

export type DraftWorkbenchNotice = {
  tone: DraftWorkbenchNoticeTone;
  title: string;
  description: string;
};

export type DraftWorkbenchJob = {
  id: string;
  type: string;
  status: WorkbenchJobStatus;
  label: string;
  startedAt: string | null;
  finishedAt: string | null;
  updatedAt: string;
  errorCode: string | null;
  errorMessage: string | null;
};

export type DraftRewriteComparison = {
  openingShift: string;
  structureShift: string;
  closeShift: string;
};

export type DraftRewriteItem = {
  id: string;
  strategy: string;
  strategyLabel: string;
  title: string;
  diffSummary: string;
  score: number | null;
  scoreLabel: string;
  isSelected: boolean;
  createdAt: string;
  openingExcerpt: string;
  comparison: DraftRewriteComparison;
};

export type DraftPublishPackageItem = {
  id: string;
  channel: string;
  channelLabel: string;
  status: string;
  statusLabel: string;
  exportPath: string | null;
  draftUrl: string | null;
  updatedAt: string;
};

export type DraftReadingPane = {
  label: string;
  title: string;
  summary: string | null;
  content: string;
  contentFormat: string;
  openingExcerpt: string;
};

export type DraftWorkbenchCapabilities = {
  canTriggerRewrite: boolean;
  canSelectRewrite: boolean;
  canPackage: boolean;
  disabledReason: string | null;
};

export type DraftWorkbenchHeader = {
  id: string;
  topicClusterId: string;
  draftType: string;
  draftTypeLabel: string;
  status: string;
  statusLabel: string;
  title: string;
  summary: string | null;
  version: number;
  currentRewriteId: string | null;
  createdAt: string;
  updatedAt: string;
};

export type DraftWorkbenchDetail = {
  draft: DraftWorkbenchHeader;
  readingPane: DraftReadingPane;
  basePane: DraftReadingPane;
  selectedRewrite: DraftRewriteItem | null;
  rewrites: DraftRewriteItem[];
  packages: DraftPublishPackageItem[];
  activeJobs: DraftWorkbenchJob[];
  latestJob: DraftWorkbenchJob | null;
  capabilities: DraftWorkbenchCapabilities;
  notices: DraftWorkbenchNotice[];
};

export type DraftDirectoryItem = {
  id: string;
  title: string;
  summary: string | null;
  status: string;
  statusLabel: string;
  draftTypeLabel: string;
  version: number;
  updatedAt: string;
  currentRewriteLabel: string;
};

export type TriggerRewriteInput = {
  strategies: string[];
  voiceProfileId?: string | null;
};

export type SelectRewriteInput = {
  rewriteId: string;
};

export type PackageDraftInput = {
  channels: string[];
  rewriteId?: string | null;
};

export type DraftActionJobResponse = {
  jobId: string;
  status: WorkbenchJobStatus;
  draftId: string;
  entityType: "DRAFT";
  entityId: string;
};

export type DraftRewriteListResponse = {
  items: DraftRewriteItem[];
};

export type DraftAssetItem = {
  id: string;
  type: string;
  path: string;
  mimeType: string | null;
  fileSize: number | null;
  promptText: string | null;
  createdAt: string;
  updatedAt: string;
};

export type DraftAssetListResponse = {
  items: DraftAssetItem[];
};

export type DraftPublishPackageListResponse = {
  items: DraftPublishPackageItem[];
};
