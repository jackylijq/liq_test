import type { TermDraft } from "@/lib/types";
import { baiduBrowserTranslateTerm } from "./baidu-browser-provider";
import { baiduTranslateEnrichTerm } from "./baidu-translate-provider";
import { mockEnrichTerm } from "./mock-provider";
import { openAiEnrichTerm } from "./openai-provider";

type EnrichTermOptions = {
  useBrowser?: boolean;
};

function hasWebLookupMeaning(draft: TermDraft) {
  return draft.meanings.some((meaning) => meaning.chineseMeaning.trim() && meaning.fieldSources.chineseMeaning === "web_lookup");
}

export async function enrichTermDraft(draft: TermDraft, options: EnrichTermOptions = {}): Promise<TermDraft> {
  let baiduDraft: TermDraft | undefined;

  try {
    baiduDraft = await baiduTranslateEnrichTerm(draft);
    if (!options.useBrowser && hasWebLookupMeaning(baiduDraft)) {
      return await mockEnrichTerm(baiduDraft);
    }
  } catch {
    // The web endpoint is best-effort and can change or throttle; keep imports usable.
  }

  if (options.useBrowser) {
    try {
      const browserDraft = await baiduBrowserTranslateTerm(baiduDraft ?? draft);
      if (hasWebLookupMeaning(browserDraft)) {
        return await mockEnrichTerm(browserDraft);
      }
    } catch {
      // Browser scraping depends on Baidu's live page and can fail under captcha/risk checks.
    }
  }

  if (!process.env.OPENAI_API_KEY) {
    return mockEnrichTerm(baiduDraft ?? draft);
  }

  try {
    return await openAiEnrichTerm(baiduDraft ?? draft);
  } catch {
    return mockEnrichTerm(baiduDraft ?? draft);
  }
}
