export type GenerateTaskType = "GENERATE_MASTER" | "REWRITE" | "PACKAGE_CHANNEL";

export interface GenerateContentInput {
  taskType: GenerateTaskType;
  prompt: string;
  context: Record<string, unknown>;
  model?: string;
}

export interface GenerateContentOutput {
  title?: string;
  summary?: string;
  content: string;
  metadata?: Record<string, unknown>;
}

export interface LlmAdapter {
  generate(input: GenerateContentInput): Promise<GenerateContentOutput>;
}
