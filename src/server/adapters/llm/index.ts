import { mockLlmAdapter } from "@/server/adapters/llm/mock";
import { openAiLlmAdapter } from "@/server/adapters/llm/openai";
import type {
  GenerateContentInput,
  GenerateContentOutput,
  LlmAdapter,
} from "@/server/adapters/llm/types";

function resolveLlmAdapter(): LlmAdapter {
  if (process.env.CONTENT_WORKBENCH_LLM_PROVIDER === "openai") {
    return openAiLlmAdapter;
  }

  return mockLlmAdapter;
}

export async function generateContent(input: GenerateContentInput): Promise<GenerateContentOutput> {
  return resolveLlmAdapter().generate(input);
}

export type {
  GenerateContentInput,
  GenerateContentOutput,
  GenerateTaskType,
  LlmAdapter,
} from "@/server/adapters/llm/types";
