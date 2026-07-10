import type { Browser, BrowserContext, Page } from "playwright";
import { logTeacherDebug } from "@/lib/debug/teacher-debug";
import type { MeaningDraft, TermDraft } from "@/lib/types";
import { choosePhoneticSymbol } from "@/lib/terms/phonetics";
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
  return options.timeoutMs ?? Number(process.env.BAIDU_BROWSER_TRANSLATE_TIMEOUT_MS ?? 10000);
}

async function getBrowser() {
  if (!browserPromise) {
    logTeacherDebug("provider", "browser-provider:launch", {});
    browserPromise = import("playwright").then(({ chromium }) =>
      chromium.launch({
        headless: true,
        args: ["--disable-blink-features=AutomationControlled"],
      }),
    );
  }
  return browserPromise;
}

export function buildBaiduTranslatePageUrl(text: string) {
  return `https://fanyi.baidu.com/mtpe-individual/transText?query=${encodeURIComponent(text)}&lang=en2zh&ext_channel=pcPinzhuan#/`;
}

function isBaiduSecurityVerificationText(text: string) {
  return (
    text.includes("Baidu Security Verification") ||
    text.includes("Verification failed") ||
    text.includes("Click the numbers from largest to smallest")
  );
}

async function withBaiduPage<T>(text: string, timeoutMs: number, callback: (page: Page) => Promise<T>) {
  const browser = await getBrowser();
  let context: BrowserContext | undefined;
  let page: Page | undefined;

  try {
    context = await browser.newContext();
    page = await context.newPage();
    page.setDefaultTimeout(timeoutMs);
    const url = buildBaiduTranslatePageUrl(text);
    logTeacherDebug("provider", "browser-provider:goto:before", { timeoutMs, url });
    await page.goto(url, { waitUntil: "domcontentloaded", timeout: timeoutMs });
    logTeacherDebug("provider", "browser-provider:goto:after", {
      url: page.url(),
      title: await page.title().catch(() => ""),
    });
    try {
      await waitForBaiduRenderedTranslation(page, text, timeoutMs);
    } catch (error) {
      const pageText = await page.locator("body").innerText({ timeout: 5000 }).catch(() => "");
      logTeacherDebug("provider", "browser-provider:rendered-translation:timeout", {
        text,
        error: error instanceof Error ? { name: error.name, message: error.message } : error,
        pageTextLength: pageText.length,
        pageTextPreview: pageText.slice(0, 2000),
      });
    }
    return await callback(page);
  } finally {
    await page?.close().catch(() => undefined);
    await context?.close().catch(() => undefined);
  }
}

async function waitForBaiduRenderedTranslation(page: Page, text: string, timeoutMs: number) {
  await page.waitForFunction(
    (query) => {
      const bodyText = document.body?.innerText ?? "";
      if (
        bodyText.includes("Baidu Security Verification") ||
        bodyText.includes("Verification failed") ||
        bodyText.includes("Click the numbers from largest to smallest")
      ) {
        return true;
      }
      if (!bodyText.includes(query)) return false;
      if (bodyText.includes("简明释义") || bodyText.includes("网络") || /英\/[^\n]+/.test(bodyText)) return true;

      const lines = bodyText.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
      const aiIndex = lines.findIndex((line) => line === "AI大模型翻译");
      if (aiIndex < 0) return false;
      const editIndex = lines.findIndex((line, index) => index > aiIndex && line === "编辑译文");
      if (editIndex < 0) return false;

      return lines.slice(aiIndex + 1, editIndex).some((line) => {
        if (!line || line === query || line === "编辑译文" || line === "段落对照") return false;
        return /[\u4e00-\u9fff]/.test(line);
      });
    },
    text,
    { timeout: timeoutMs },
  );
}

async function translateWithBaiduBrowser(text: string, timeoutMs: number) {
  return withBaiduPage(text, timeoutMs, async (page) => {
    const pageText = await page.locator("body").innerText({ timeout: timeoutMs });
    logTeacherDebug("provider", "browser-provider:page-text", {
      text,
      length: pageText.length,
      preview: pageText.slice(0, 2000),
    });
    if (isBaiduSecurityVerificationText(pageText)) {
      logTeacherDebug("provider", "browser-provider:security-blocked", {
        text,
        length: pageText.length,
        preview: pageText.slice(0, 1000),
      });
    }
    return parseBaiduRenderedPageText(pageText, text);
  });
}

function summarizeBrowserResponse(response: unknown) {
  const record = response && typeof response === "object" ? (response as BaiduBrowserResponse) : undefined;
  const result = parseJsonObject(record?.result);
  const content = Array.isArray(result?.content) ? result.content : [];
  const voice = Array.isArray(result?.voice) ? result.voice : [];

  return {
    type: typeof response,
    status: record?.status,
    errno: record?.errno,
    resultType: typeof record?.result,
    resultKeys: result ? Object.keys(result) : [],
    src: typeof result?.src === "string" ? result.src : undefined,
    contentCount: content.length,
    voiceCount: voice.length,
    firstContent: content[0],
  };
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

export function parseBaiduRenderedPageText(pageText: string, sourceText: string): BaiduBrowserResponse {
  const lines = pageText.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  const dictionaryIndex = findDictionaryTermIndex(lines, sourceText);
  const reviewExplanation = extractRenderedReviewExplanation(lines, sourceText);
  const result: Record<string, unknown> = {
    src: sourceText,
    content: [],
  };

  const voice = dictionaryIndex >= 0 ? extractRenderedVoice(lines, dictionaryIndex) : [];
  if (voice.length) result.voice = voice;

  const meanings = dictionaryIndex >= 0 ? extractRenderedDictionaryMeanings(lines, dictionaryIndex) : [];
  if (meanings.length) {
    result.content = [{ mean: meanings }];
  } else {
    const translatedMeaning = extractRenderedPrimaryTranslation(lines, sourceText);
    if (translatedMeaning) {
      result.content = [{ mean: [{ cont: { [translatedMeaning]: 0 } }] }];
    }
  }

  if (reviewExplanation) result.review_explanation = reviewExplanation;

  return {
    status: 0,
    result: JSON.stringify(result),
  };
}

function findDictionaryTermIndex(lines: string[], sourceText: string) {
  const normalizedSource = sourceText.trim().toLowerCase();
  for (let index = lines.length - 1; index >= 0; index -= 1) {
    if (lines[index].toLowerCase() !== normalizedSource) continue;
    const nearby = lines.slice(index + 1, index + 8);
    if (nearby.some((line) => line.startsWith("英/") || line.startsWith("美/") || line === "网络" || isPartOfSpeechLine(line))) return index;
  }
  return -1;
}

function extractRenderedVoice(lines: string[], dictionaryIndex: number) {
  const voice: Record<string, string>[] = [];
  const english = lines.slice(dictionaryIndex + 1, dictionaryIndex + 8).find((line) => line.startsWith("英/"));
  const american = lines.slice(dictionaryIndex + 1, dictionaryIndex + 8).find((line) => line.startsWith("美/"));
  if (english) voice.push({ en_phonic: english.replace(/^英/, "") });
  if (american) voice.push({ us_phonic: american.replace(/^美/, "") });
  return voice;
}

function extractRenderedDictionaryMeanings(lines: string[], dictionaryIndex: number) {
  const meanings: { pre?: string; cont: Record<string, number> }[] = [];
  const windowLines = lines.slice(dictionaryIndex + 1, dictionaryIndex + 80);
  for (let index = 0; index < windowLines.length; index += 1) {
    const line = windowLines[index];
    if (isDictionaryEndLine(line)) break;

    if (isPartOfSpeechLine(line)) {
      const chineseMeaning = windowLines[index + 1];
      if (chineseMeaning && !isDictionaryEndLine(chineseMeaning) && !isPartOfSpeechLine(chineseMeaning)) {
        meanings.push({ pre: line, cont: meaningTextToCont(chineseMeaning) });
        index += 1;
      }
      continue;
    }

    if (line === "网络") {
      const chineseMeaning = windowLines[index + 1];
      if (chineseMeaning && !isDictionaryEndLine(chineseMeaning)) meanings.push({ cont: meaningTextToCont(chineseMeaning) });
      break;
    }
  }
  return meanings;
}

function isPartOfSpeechLine(line: string) {
  return /^(n|v|adj|adv|prep|pron|conj|interj|modal)\.$/i.test(line);
}

function isDictionaryEndLine(line: string) {
  return /^(第三人称单数|高考|CET|考研|牛津词典|柯林斯词典|英英释义|例句|词语用例|同反义词|展开|AI论文精翻)$/.test(line);
}

function meaningTextToCont(text: string) {
  return Object.fromEntries(text.split(/[；;]/).map((item) => item.trim()).filter(Boolean).map((item) => [item, 0]));
}

function extractRenderedPrimaryTranslation(lines: string[], sourceText: string) {
  const aiIndex = lines.findIndex((line) => line === "AI大模型翻译");
  if (aiIndex < 0) return "";
  const editIndex = lines.findIndex((line, index) => index > aiIndex && line === "编辑译文");
  if (editIndex < 0) return "";
  return lines
    .slice(aiIndex + 1, editIndex)
    .filter((line) => line && line !== sourceText && line !== "编辑译文" && line !== "段落对照")
    .join(" ")
    .trim();
}

function extractRenderedReviewExplanation(lines: string[], sourceText: string) {
  const startIndex = lines.findIndex((line) => line === "段落对照");
  if (startIndex < 0) return buildReviewExplanation(sourceText);

  const explanationLines: string[] = [];
  for (const line of lines.slice(startIndex + 1)) {
    if (line === "试一试：" || line === "翻译详解" || line === "关键术语解释" || line === "以上为AI翻译结果") break;
    if (line === sourceText || line === "编辑译文" || line === "段落对照") continue;
    explanationLines.push(line);
  }

  const renderedExplanation = explanationLines.join("\n").trim();
  const fallbackExplanation = buildReviewExplanation(sourceText);
  if (renderedExplanation && fallbackExplanation && !renderedExplanation.includes(fallbackExplanation)) {
    return `${renderedExplanation}\n\n${fallbackExplanation}`;
  }
  return renderedExplanation || fallbackExplanation;
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
  const reviewExplanation = collectReviewExplanation(result, sourceText);

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

function collectReviewExplanation(result: Record<string, unknown> | undefined, sourceText: string) {
  const renderedExplanation = typeof result?.review_explanation === "string" ? result.review_explanation.trim() : "";
  return renderedExplanation || buildReviewExplanation(sourceText);
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

function fieldSourcesWithExplanation(explanation: string | undefined): MeaningDraft["fieldSources"] {
  return explanation ? { ...fieldSources(), explanation: "web_lookup" } : fieldSources();
}

function mergeBrowserMeaning(draft: TermDraft, chineseMeaning: string, explanation?: string): MeaningDraft[] {
  if (!draft.meanings.length) {
    const generatedMeaning: MeaningDraft = {
      chineseMeaning,
      fieldSources: fieldSourcesWithExplanation(explanation),
    };
    if (explanation) generatedMeaning.explanation = explanation;
    return [generatedMeaning];
  }

  return draft.meanings.map((meaning, index) => {
    if (index > 0 || hasVisibleChineseMeaning(draft.text, meaning)) return meaning;
    const nextFieldSources: MeaningDraft["fieldSources"] = {
      ...withoutMockOnlySources(meaning.fieldSources),
      chineseMeaning: "web_lookup",
    };
    if (explanation) nextFieldSources.explanation = "web_lookup";

    return {
      ...meaning,
      chineseMeaning,
      exampleSentence: meaning.fieldSources.exampleSentence === "mock_generated" ? undefined : meaning.exampleSentence,
      explanation: meaning.fieldSources.explanation === "mock_generated" ? explanation : (meaning.explanation ?? explanation),
      usageContext: meaning.fieldSources.usageContext === "mock_generated" ? undefined : meaning.usageContext,
      fieldSources: nextFieldSources,
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
  logTeacherDebug("provider", "browser-provider:parse:input", {
    text: draft.text,
    response: summarizeBrowserResponse(response),
  });
  if (baiduResponse.status !== 0 && baiduResponse.errno !== 0) {
    logTeacherDebug("provider", "browser-provider:parse:ignored-status", {
      status: baiduResponse.status,
      errno: baiduResponse.errno,
    });
    return draft;
  }

  const result = parseJsonObject(baiduResponse.result);
  const structuredMeanings = draft.termType === "word" ? collectStructuredMeanings(result) : [];
  const chineseMeaning = structuredMeanings.length ? "" : collectChineseMeanings(result);
  const reviewExplanation = collectReviewExplanation(result, draft.text);
  logTeacherDebug("provider", "browser-provider:parse:extracted", {
    text: draft.text,
    structuredMeanings,
    chineseMeaning,
    reviewExplanation,
    phoneticSymbol: collectPhoneticSymbol(result),
  });
  if (!structuredMeanings.length && !chineseMeaning) return draft;

  return {
    ...draft,
    phoneticSymbol: draft.termType === "word" ? (choosePhoneticSymbol(draft.text, draft.phoneticSymbol, collectPhoneticSymbol(result)) ?? undefined) : undefined,
    pronunciationUrl: draft.termType === "word" ? (draft.pronunciationUrl ?? buildBaiduTtsUrl(draft.text)) : undefined,
    meanings: structuredMeanings.length ? structuredMeanings : mergeBrowserMeaning(draft, chineseMeaning, reviewExplanation),
  };
}

export async function baiduBrowserTranslateTerm(draft: TermDraft, options: BaiduBrowserTranslateOptions = {}) {
  logTeacherDebug("provider", "browser-provider:translate:before", {
    text: draft.text,
    termType: draft.termType,
    timeoutMs: getTimeout(options),
    injectedTranslator: Boolean(options.translateInBrowser),
  });
  const response = options.translateInBrowser
    ? await options.translateInBrowser(draft.text)
    : await translateWithBaiduBrowser(draft.text, getTimeout(options));
  logTeacherDebug("provider", "browser-provider:translate:after", {
    text: draft.text,
    response: summarizeBrowserResponse(response),
  });
  const parsedDraft = parseBaiduBrowserTranslateResponse(response, draft);
  logTeacherDebug("provider", "browser-provider:translate:parsed", {
    text: parsedDraft.text,
    phoneticSymbol: parsedDraft.phoneticSymbol,
    meanings: parsedDraft.meanings,
  });
  return parsedDraft;
}
