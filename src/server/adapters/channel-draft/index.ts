import { mockChannelDraftAdapter } from "@/server/adapters/channel-draft/mock";
import type {
  ChannelDraftAdapter,
  CreateRemoteDraftInput,
  CreateRemoteDraftOutput,
} from "@/server/adapters/channel-draft/types";

function resolveChannelDraftAdapter(): ChannelDraftAdapter {
  return mockChannelDraftAdapter;
}

export async function createRemoteDraft(
  input: CreateRemoteDraftInput,
): Promise<CreateRemoteDraftOutput> {
  return resolveChannelDraftAdapter().createRemoteDraft(input);
}

export type {
  ChannelDraftAdapter,
  CreateRemoteDraftInput,
  CreateRemoteDraftOutput,
} from "@/server/adapters/channel-draft/types";
