import { ChannelType, DraftStatus, PublishStatus, TopicStatus } from "@prisma/client";
import { JobsServiceError } from "@/server/services/jobs/errors";

const supportedRemoteDraftChannels = new Set<ChannelType>([
  ChannelType.WECHAT,
  ChannelType.X_ARTICLE,
]);

export function assertTopicCanGenerateMaster(
  topicStatus: TopicStatus,
  activeMasterDraftCount: number,
  topicId: string,
): void {
  if (topicStatus !== TopicStatus.IN_PROGRESS) {
    throw new JobsServiceError(
      "TOPIC_STATUS_INVALID",
      "Topic must be in progress before generating a master draft.",
      409,
      {
        topicId,
        currentStatus: topicStatus,
      },
    );
  }

  if (activeMasterDraftCount > 0) {
    throw new JobsServiceError(
      "TOPIC_ALREADY_HAS_ACTIVE_MASTER_DRAFT",
      "Topic already has an active master draft.",
      409,
      {
        topicId,
        activeMasterDraftCount,
      },
    );
  }
}

export function assertDraftCanRewrite(draftStatus: DraftStatus, draftId: string): void {
  if (
    draftStatus === DraftStatus.ARCHIVED ||
    draftStatus === DraftStatus.IN_REVIEW ||
    draftStatus === DraftStatus.APPROVED ||
    draftStatus === DraftStatus.READY_TO_PUBLISH
  ) {
    throw new JobsServiceError(
      "DRAFT_STATUS_INVALID",
      "Draft is not in a valid state for rewrite.",
      409,
      {
        draftId,
        currentStatus: draftStatus,
      },
    );
  }
}

export function assertDraftCanPackage(draftStatus: DraftStatus, draftId: string): void {
  if (
    draftStatus === DraftStatus.ARCHIVED ||
    draftStatus === DraftStatus.IN_REVIEW ||
    draftStatus === DraftStatus.APPROVED ||
    draftStatus === DraftStatus.READY_TO_PUBLISH
  ) {
    throw new JobsServiceError(
      "DRAFT_STATUS_INVALID",
      "Draft is not in a valid state for packaging.",
      409,
      {
        draftId,
        currentStatus: draftStatus,
      },
    );
  }
}

export function reduceDraftStatusAfterRewrite(
  draftStatus: DraftStatus,
  draftId: string,
): DraftStatus {
  assertDraftCanRewrite(draftStatus, draftId);

  if (draftStatus === DraftStatus.CREATED || draftStatus === DraftStatus.REJECTED) {
    return DraftStatus.REWRITTEN;
  }

  return draftStatus;
}

export function reduceDraftStatusAfterPackaging(
  draftStatus: DraftStatus,
  draftId: string,
): DraftStatus {
  assertDraftCanPackage(draftStatus, draftId);

  if (
    draftStatus === DraftStatus.CREATED ||
    draftStatus === DraftStatus.REWRITTEN ||
    draftStatus === DraftStatus.PACKAGED ||
    draftStatus === DraftStatus.REJECTED
  ) {
    return DraftStatus.PACKAGED;
  }

  throw new JobsServiceError(
    "DRAFT_STATUS_INVALID",
    "Draft is not in a valid state for packaging.",
    409,
    {
      draftId,
      currentStatus: draftStatus,
    },
  );
}

export function assertPublishPackageCanExport(
  publishStatus: PublishStatus,
  publishPackageId: string,
): void {
  if (publishStatus !== PublishStatus.PENDING && publishStatus !== PublishStatus.FAILED) {
    throw new JobsServiceError(
      "PUBLISH_PACKAGE_STATUS_INVALID",
      "Package is not in a valid state for export.",
      409,
      {
        publishPackageId,
        currentStatus: publishStatus,
      },
    );
  }
}

export function assertPublishPackageCanCreateRemoteDraft(input: {
  channel: ChannelType;
  publishStatus: PublishStatus;
  publishPackageId: string;
  draftId: string;
  draftStatus: DraftStatus;
}): void {
  if (!supportedRemoteDraftChannels.has(input.channel)) {
    throw new JobsServiceError(
      "CHANNEL_DRAFT_NOT_SUPPORTED",
      "This channel does not support remote draft creation.",
      409,
      {
        publishPackageId: input.publishPackageId,
        channel: input.channel,
      },
    );
  }

  if (input.draftStatus !== DraftStatus.READY_TO_PUBLISH) {
    throw new JobsServiceError(
      "REVIEW_REQUIRED_BEFORE_PUBLISH",
      "Draft must be approved and marked ready to publish before creating a remote draft.",
      409,
      {
        draftId: input.draftId,
        currentStatus: input.draftStatus,
      },
    );
  }

  if (input.publishStatus === PublishStatus.PUBLISHED) {
    throw new JobsServiceError(
      "PUBLISH_PACKAGE_STATUS_INVALID",
      "Published package cannot create a remote draft.",
      409,
      {
        publishPackageId: input.publishPackageId,
        currentStatus: input.publishStatus,
      },
    );
  }
}
