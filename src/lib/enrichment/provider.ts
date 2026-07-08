import type { TermDraft } from "@/lib/types";
import { mockEnrichTerm } from "./mock-provider";
import { openAiEnrichTerm } from "./openai-provider";

export async function enrichTermDraft(draft: TermDraft): Promise<TermDraft> {
  if (!process.env.OPENAI_API_KEY) {
    return mockEnrichTerm(draft);
  }

  try {
    return await openAiEnrichTerm(draft);
  } catch {
    return mockEnrichTerm(draft);
  }
}
