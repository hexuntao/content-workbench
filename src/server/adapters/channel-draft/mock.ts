import type {
  ChannelDraftAdapter,
  CreateRemoteDraftInput,
  CreateRemoteDraftOutput,
} from "@/server/adapters/channel-draft/types";

export const mockChannelDraftAdapter: ChannelDraftAdapter = {
  async createRemoteDraft(input: CreateRemoteDraftInput): Promise<CreateRemoteDraftOutput> {
    const remoteId = `remote_${input.channel.toLowerCase()}_${crypto.randomUUID()}`;

    return {
      draftUrl: `https://example.com/${input.channel.toLowerCase()}/drafts/${remoteId}`,
      remoteId,
      metadata: {
        provider: "mock",
      },
    };
  },
};
