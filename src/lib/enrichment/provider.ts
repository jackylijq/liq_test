import type { TermDraft } from "@/lib/types";
import { logTeacherDebug } from "@/lib/debug/teacher-debug";
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

function debugTermDraft(draft: TermDraft) {
  return {
    text: draft.text,
    termType: draft.termType,
    phoneticSymbol: draft.phoneticSymbol,
    pronunciationUrl: draft.pronunciationUrl,
    meanings: draft.meanings.map((meaning) => ({
      partOfSpeech: meaning.partOfSpeech,
      chineseMeaning: meaning.chineseMeaning,
      exampleSentence: meaning.exampleSentence,
      explanation: meaning.explanation,
      usageContext: meaning.usageContext,
      fieldSources: meaning.fieldSources,
    })),
  };
}

function debugError(error: unknown) {
  if (error instanceof Error) {
    return {
      name: error.name,
      message: error.message,
      stack: error.stack,
    };
  }
  return error;
}

export async function enrichTermDraft(draft: TermDraft, options: EnrichTermOptions = {}): Promise<TermDraft> {
  logTeacherDebug("provider", "start", {
    useBrowser: options.useBrowser === true,
    draft: debugTermDraft(draft),
  });

  let baiduDraft: TermDraft | undefined;

  try {
    baiduDraft = await baiduTranslateEnrichTerm(draft);
    logTeacherDebug("provider", "baidu-http:success", {
      hasWebLookupMeaning: hasWebLookupMeaning(baiduDraft),
      draft: debugTermDraft(baiduDraft),
    });
    if (!options.useBrowser && hasWebLookupMeaning(baiduDraft)) {
      const enrichedDraft = await mockEnrichTerm(baiduDraft);
      logTeacherDebug("provider", "return:baidu-http-with-mock-fields", {
        draft: debugTermDraft(enrichedDraft),
      });
      return enrichedDraft;
    }
  } catch (error) {
    logTeacherDebug("provider", "baidu-http:error", debugError(error));
    // The web endpoint is best-effort and can change or throttle; keep imports usable.
  }

  if (options.useBrowser) {
    try {
      logTeacherDebug("provider", "browser:before", {
        draft: debugTermDraft(baiduDraft ?? draft),
      });
      const browserDraft = await baiduBrowserTranslateTerm(baiduDraft ?? draft);
      logTeacherDebug("provider", "browser:after", {
        hasWebLookupMeaning: hasWebLookupMeaning(browserDraft),
        draft: debugTermDraft(browserDraft),
      });
      if (hasWebLookupMeaning(browserDraft)) {
        logTeacherDebug("provider", "return:browser", {
          draft: debugTermDraft(browserDraft),
        });
        return browserDraft;
      }
    } catch (error) {
      logTeacherDebug("provider", "browser:error", debugError(error));
      // Browser scraping depends on Baidu's live page and can fail under captcha/risk checks.
    }
  }

  if (!process.env.OPENAI_API_KEY) {
    logTeacherDebug("provider", "fallback:mock:no-openai-key", {
      draft: debugTermDraft(baiduDraft ?? draft),
    });
    const fallbackDraft = await mockEnrichTerm(baiduDraft ?? draft);
    logTeacherDebug("provider", "return:mock", {
      draft: debugTermDraft(fallbackDraft),
    });
    return fallbackDraft;
  }

  try {
    logTeacherDebug("provider", "openai:before", {
      draft: debugTermDraft(baiduDraft ?? draft),
    });
    const openAiDraft = await openAiEnrichTerm(baiduDraft ?? draft);
    logTeacherDebug("provider", "return:openai", {
      draft: debugTermDraft(openAiDraft),
    });
    return openAiDraft;
  } catch (error) {
    logTeacherDebug("provider", "openai:error", debugError(error));
    logTeacherDebug("provider", "fallback:mock:openai-error", {
      draft: debugTermDraft(baiduDraft ?? draft),
    });
    const fallbackDraft = await mockEnrichTerm(baiduDraft ?? draft);
    logTeacherDebug("provider", "return:mock", {
      draft: debugTermDraft(fallbackDraft),
    });
    return fallbackDraft;
  }
}
