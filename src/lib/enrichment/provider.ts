import type { TermDraft } from "@/lib/types";
import { baiduTranslateEnrichTerm } from "./baidu-translate-provider";
import { mockEnrichTerm } from "./mock-provider";
import { openAiEnrichTerm } from "./openai-provider";

export async function enrichTermDraft(draft: TermDraft): Promise<TermDraft> {
  try {
    return await mockEnrichTerm(await baiduTranslateEnrichTerm(draft));
  } catch {
    // The web endpoint is best-effort and can change or throttle; keep imports usable.
  }

  if (!process.env.OPENAI_API_KEY) {
    return mockEnrichTerm(draft);
  }

  try {
    return await openAiEnrichTerm(draft);
  } catch {
    return mockEnrichTerm(draft);
  }
}
