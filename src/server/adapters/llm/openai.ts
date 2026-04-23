import type {
  GenerateContentInput,
  GenerateContentOutput,
  LlmAdapter,
} from "@/server/adapters/llm/types";
import { JobsServiceError } from "@/server/services/jobs/errors";

export const openAiLlmAdapter: LlmAdapter = {
  async generate(input: GenerateContentInput): Promise<GenerateContentOutput> {
    if (!process.env.OPENAI_API_KEY) {
      throw new JobsServiceError(
        "LLM_REQUEST_FAILED",
        "OpenAI provider is not configured for this environment.",
        503,
        {
          taskType: input.taskType,
        },
      );
    }

    throw new JobsServiceError(
      "LLM_REQUEST_FAILED",
      "OpenAI provider wiring is reserved but not fully enabled in this workspace.",
      503,
      {
        taskType: input.taskType,
      },
    );
  },
};
