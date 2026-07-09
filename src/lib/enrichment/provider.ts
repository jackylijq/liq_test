import type { TermDraft } from "@/lib/types";
import { baiduTranslateEnrichTerm } from "./baidu-translate-provider";
import { mockEnrichTerm } from "./mock-provider";
import { openAiEnrichTerm } from "./openai-provider";

export async function enrichTermDraft(draft: TermDraft): Promise<TermDraft> {
  if (process.env.BAIDU_TRANSLATE_APP_ID && process.env.BAIDU_TRANSLATE_SECRET_KEY) {
    try {
      return await mockEnrichTerm(await baiduTranslateEnrichTerm(draft));
    } catch {
      return mockEnrichTerm(draft);
    }
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
