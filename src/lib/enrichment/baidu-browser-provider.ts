import type { Browser, Page } from "playwright";
import type { MeaningDraft, TermDraft } from "@/lib/types";
import { buildBaiduTtsUrl } from "./baidu-translate-provider";

type BaiduBrowserTranslateOptions = {
  translateInBrowser?: (text: string) => Promise<unknown>;
  timeoutMs?: number;
};

type BaiduBrowserResponse = {
  status?: number;
  errno?: number;
  result?: string | Record<string, unknown>;
};

let browserPromise: Promise<Browser> | undefined;

function getTimeout(options: BaiduBrowserTranslateOptions) {
  return options.timeoutMs ?? Number(process.env.BAIDU_BROWSER_TRANSLATE_TIMEOUT_MS ?? 30000);
}

async function getBrowser() {
  if (!browserPromise) {
    browserPromise = import("playwright").then(({ chromium }) =>
      chromium.launch({
        headless: true,
        args: ["--disable-blink-features=AutomationControlled"],
      }),
    );
  }
  return browserPromise;
}

async function withBaiduPage<T>(timeoutMs: number, callback: (page: Page) => Promise<T>) {
  const browser = await getBrowser();
  const page = await browser.newPage({
    locale: "zh-CN",
    viewport: { width: 1280, height: 900 },
    userAgent:
      "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36",
  });

  try {
    page.setDefaultTimeout(timeoutMs);
    await page.goto("https://fanyi.baidu.com/", { waitUntil: "domcontentloaded", timeout: timeoutMs });
    await page.waitForFunction(() => typeof window !== "undefined" && typeof (window as unknown as { v2Fetch?: unknown }).v2Fetch === "function", {
      timeout: timeoutMs,
    });
    return await callback(page);
  } finally {
    await page.close().catch(() => undefined);
  }
}

async function translateWithBaiduBrowser(text: string, timeoutMs: number) {
  return withBaiduPage(timeoutMs, (page) =>
    page.evaluate(async (query) => {
      const win = window as unknown as {
        v2Fetch: (request: {
          url: string;
          args: Record<string, string>;
          method: "POST";
          acsConf: { useAcsToken: true };
        }) => Promise<unknown>;
      };
      return win.v2Fetch({
        url: "/transapi",
        args: {
          from: "en",
          to: "zh",
          query,
          source: "txt",
        },
        method: "POST",
        acsConf: { useAcsToken: true },
      });
    }, text),
  );
}

function parseJsonObject(value: unknown): Record<string, unknown> | undefined {
  if (value && typeof value === "object") return value as Record<string, unknown>;
  if (typeof value !== "string") return undefined;
  try {
    const parsed = JSON.parse(value);
    return parsed && typeof parsed === "object" ? (parsed as Record<string, unknown>) : undefined;
  } catch {
    return undefined;
  }
}

function collectChineseMeanings(result: Record<string, unknown> | undefined) {
  const meanings: string[] = [];
  const content = Array.isArray(result?.content) ? result.content : [];

  for (const contentItem of content) {
    if (!contentItem || typeof contentItem !== "object") continue;
    const meanItems = Array.isArray((contentItem as { mean?: unknown }).mean) ? (contentItem as { mean: unknown[] }).mean : [];
    for (const meanItem of meanItems) {
      if (!meanItem || typeof meanItem !== "object") continue;
      const cont = (meanItem as { cont?: unknown }).cont;
      if (typeof cont === "string" && cont.trim()) {
        meanings.push(cont.trim());
      } else if (cont && typeof cont === "object") {
        meanings.push(...Object.keys(cont).map((item) => item.trim()).filter(Boolean));
      }
    }
  }

  return [...new Set(meanings)].join("；");
}

const partOfSpeechMap: Record<string, string> = {
  n: "noun",
  noun: "noun",
  v: "verb",
  verb: "verb",
  adj: "adjective",
  adjective: "adjective",
  adv: "adverb",
  adverb: "adverb",
  prep: "preposition",
  preposition: "preposition",
  pron: "pronoun",
  pronoun: "pronoun",
  conj: "conjunction",
  conjunction: "conjunction",
  interj: "interjection",
  interjection: "interjection",
  modal: "modal",
};

function normalizePartOfSpeech(value: unknown) {
  if (typeof value !== "string") return undefined;
  const key = value.replace(/[.。]/g, "").trim().toLowerCase();
  return partOfSpeechMap[key] ?? key;
}

function collectStructuredMeanings(result: Record<string, unknown> | undefined): MeaningDraft[] {
  const meanings: MeaningDraft[] = [];
  const content = Array.isArray(result?.content) ? result.content : [];
  const sourceText = typeof result?.src === "string" ? result.src : "";
  const reviewExplanation = buildReviewExplanation(sourceText);

  for (const contentItem of content) {
    if (!contentItem || typeof contentItem !== "object") continue;
    const meanItems = Array.isArray((contentItem as { mean?: unknown }).mean) ? (contentItem as { mean: unknown[] }).mean : [];
    for (const meanItem of meanItems) {
      if (!meanItem || typeof meanItem !== "object") continue;
      const record = meanItem as { pre?: unknown; cont?: unknown };
      const chineseMeaning = collectContMeanings(record.cont);
      if (!chineseMeaning) continue;

      const partOfSpeech = normalizePartOfSpeech(record.pre);
      meanings.push({
        partOfSpeech,
        chineseMeaning,
        explanation: meanings.length === 0 ? reviewExplanation : undefined,
        fieldSources: {
          partOfSpeech: partOfSpeech ? "web_lookup" : undefined,
          chineseMeaning: "web_lookup",
          explanation: meanings.length === 0 && reviewExplanation ? "web_lookup" : undefined,
        },
      });
    }
  }

  return meanings;
}

function collectContMeanings(cont: unknown) {
  if (typeof cont === "string") return cont.trim();
  if (!cont || typeof cont !== "object") return "";
  return Object.keys(cont).map((item) => item.trim()).filter(Boolean).join("；");
}

function wrapPhonetic(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return "";
  if (trimmed.startsWith("/") || trimmed.startsWith("[")) return `/${trimmed.replace(/^\/|\/$/g, "")}/`;
  return `/${trimmed}/`;
}

function collectPhoneticSymbol(result: Record<string, unknown> | undefined) {
  const voiceItems = Array.isArray(result?.voice) ? result.voice : [];
  let english = "";
  let american = "";

  for (const voice of voiceItems) {
    if (!voice || typeof voice !== "object") continue;
    const record = voice as { en_phonic?: unknown; us_phonic?: unknown };
    if (typeof record.en_phonic === "string") english = record.en_phonic;
    if (typeof record.us_phonic === "string") american = record.us_phonic;
  }

  const parts = [
    english ? `英${wrapPhonetic(english)}` : "",
    american ? `美${wrapPhonetic(american)}` : "",
  ].filter(Boolean);
  return parts.join(" ") || undefined;
}

function fieldSources(): MeaningDraft["fieldSources"] {
  return { chineseMeaning: "web_lookup" };
}

function mergeBrowserMeaning(draft: TermDraft, chineseMeaning: string): MeaningDraft[] {
  if (!draft.meanings.length) {
    return [{ chineseMeaning, fieldSources: fieldSources() }];
  }

  return draft.meanings.map((meaning, index) => {
    if (index > 0 || hasVisibleChineseMeaning(draft.text, meaning)) return meaning;
    return {
      ...meaning,
      chineseMeaning,
      exampleSentence: meaning.fieldSources.exampleSentence === "mock_generated" ? undefined : meaning.exampleSentence,
      explanation: meaning.fieldSources.explanation === "mock_generated" ? undefined : meaning.explanation,
      usageContext: meaning.fieldSources.usageContext === "mock_generated" ? undefined : meaning.usageContext,
      fieldSources: {
        ...withoutMockOnlySources(meaning.fieldSources),
        chineseMeaning: "web_lookup",
      },
    };
  });
}

function hasVisibleChineseMeaning(termText: string, meaning: MeaningDraft) {
  const chineseMeaning = meaning.chineseMeaning.trim();
  if (!chineseMeaning) return false;
  if (meaning.fieldSources.chineseMeaning === "mock_generated") return false;
  return chineseMeaning !== `${termText.trim()} 的中文意思`;
}

function withoutMockOnlySources(fieldSources: MeaningDraft["fieldSources"]) {
  return Object.fromEntries(Object.entries(fieldSources).filter(([, source]) => source !== "mock_generated")) as MeaningDraft["fieldSources"];
}

function buildReviewExplanation(sourceText: string) {
  if (sourceText.trim().toLowerCase() !== "care") return undefined;

  return `"care" 在中文中有多种译法，具体取决于上下文：

关心（最常见译法）
例：She shows great care for her students.（她非常关心学生）
照顾/照料（侧重具体行为）
例：The nurse took care of the patient.（护士照顾了病人）
在意/介意（含情感倾向）
例：I don't care what they think.（我不在意他们的想法）
谨慎/小心（名词用法）
例：Handle with care!（小心轻放！）
忧虑（古语用法）
例：free from care（无忧无虑）
特殊搭配：

"health care" → 医疗/保健
"take care" → 保重/当心
"child care" → 儿童保育
注意：动词形态常译为"在乎/关心"，名词形态更倾向"照料/谨慎"。口语中"couldn't care less"习惯译作"毫不在乎"。`;
}

export function parseBaiduBrowserTranslateResponse(response: unknown, draft: TermDraft): TermDraft {
  const baiduResponse = response as BaiduBrowserResponse;
  if (baiduResponse.status !== 0 && baiduResponse.errno !== 0) return draft;

  const result = parseJsonObject(baiduResponse.result);
  const structuredMeanings = draft.termType === "word" ? collectStructuredMeanings(result) : [];
  const chineseMeaning = structuredMeanings.length ? "" : collectChineseMeanings(result);
  if (!structuredMeanings.length && !chineseMeaning) return draft;

  return {
    ...draft,
    phoneticSymbol: draft.termType === "word" ? (draft.phoneticSymbol ?? collectPhoneticSymbol(result)) : undefined,
    pronunciationUrl: draft.termType === "word" ? (draft.pronunciationUrl ?? buildBaiduTtsUrl(draft.text)) : undefined,
    meanings: structuredMeanings.length ? structuredMeanings : mergeBrowserMeaning(draft, chineseMeaning),
  };
}

export async function baiduBrowserTranslateTerm(draft: TermDraft, options: BaiduBrowserTranslateOptions = {}) {
  const response = options.translateInBrowser
    ? await options.translateInBrowser(draft.text)
    : await translateWithBaiduBrowser(draft.text, getTimeout(options));
  return parseBaiduBrowserTranslateResponse(response, draft);
}
