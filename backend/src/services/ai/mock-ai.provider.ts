import type { AiProvider, SummarizeInput } from "./ai-provider.js";

export class MockAiProvider implements AiProvider {
  async summarize(input: SummarizeInput): Promise<string> {
    const text = `${input.title}. ${input.body}`.trim();
    const words = text.split(/\s+/);

    const wordLimit = {
      short: 30,
      medium: 60,
      long: 100,
    }[input.length];

    const summary = words.slice(0, wordLimit).join(" ");

    return `[${input.tone} summary] ${summary}`;
  }
}
