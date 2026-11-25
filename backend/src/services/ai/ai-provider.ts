export type SummaryTone = "professional" | "friendly" | "simple";
export type SummaryLength = "short" | "medium" | "long";

export interface SummarizeInput {
  title: string;
  body: string;
  tone: SummaryTone;
  length: SummaryLength;
}

export interface AiProvider {
  summarize(input: SummarizeInput): Promise<string>;
}
