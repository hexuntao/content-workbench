import type { ChannelType, RewriteStrategy } from "@prisma/client";

export interface IngestionWorkflowInput {
  sourceId: string;
}

export interface IngestionWorkflowOutput {
  sourceId: string;
  fetchedCount: number;
  insertedCount: number;
  dedupedCount: number;
}

export interface GenerateMasterDraftWorkflowInput {
  topicClusterId: string;
  model?: string;
}

export interface GenerateMasterDraftWorkflowOutput {
  topicClusterId: string;
  draftId: string;
  title: string;
  summary?: string;
}

export interface RewriteDraftWorkflowInput {
  draftId: string;
  strategies: RewriteStrategy[];
  voiceProfileId?: string | null;
  model?: string;
}

export interface RewriteDraftWorkflowOutput {
  draftId: string;
  rewriteIds: string[];
  selectedRewriteId: string | null;
  draftStatus: string;
}

export interface PackageDraftWorkflowInput {
  draftId: string;
  channels: ChannelType[];
  rewriteId?: string | null;
  model?: string;
}

export interface PackageDraftWorkflowOutput {
  draftId: string;
  packageIds: string[];
  draftStatus: string;
}

export interface ExportPublishPackageWorkflowInput {
  publishPackageId: string;
}

export interface ExportPublishPackageWorkflowOutput {
  publishPackageId: string;
  key: string;
  url?: string;
}

export interface CreateRemoteDraftWorkflowInput {
  publishPackageId: string;
  channelAccountId?: string | null;
}

export interface CreateRemoteDraftWorkflowOutput {
  publishPackageId: string;
  draftUrl: string;
  remoteId?: string;
}

export type WorkflowOutput =
  | IngestionWorkflowOutput
  | GenerateMasterDraftWorkflowOutput
  | RewriteDraftWorkflowOutput
  | PackageDraftWorkflowOutput
  | ExportPublishPackageWorkflowOutput
  | CreateRemoteDraftWorkflowOutput;
