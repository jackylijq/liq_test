import type { Browser, Page } from "playwright";
import type { MeaningDraft, TermDraft } from "@/lib/types";

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

function fieldSources(): MeaningDraft["fieldSources"] {
  return { chineseMeaning: "web_lookup" };
}

function mergeBrowserMeaning(draft: TermDraft, chineseMeaning: string): MeaningDraft[] {
  if (!draft.meanings.length) {
    return [{ chineseMeaning, fieldSources: fieldSources() }];
  }

  return draft.meanings.map((meaning, index) => {
    if (index > 0 || meaning.chineseMeaning.trim()) return meaning;
    return {
      ...meaning,
      chineseMeaning,
      fieldSources: {
        ...meaning.fieldSources,
        chineseMeaning: "web_lookup",
      },
    };
  });
}

export function parseBaiduBrowserTranslateResponse(response: unknown, draft: TermDraft): TermDraft {
  const baiduResponse = response as BaiduBrowserResponse;
  if (baiduResponse.status !== 0 && baiduResponse.errno !== 0) return draft;

  const result = parseJsonObject(baiduResponse.result);
  const chineseMeaning = collectChineseMeanings(result);
  if (!chineseMeaning) return draft;

  return {
    ...draft,
    phoneticSymbol: draft.termType === "word" ? draft.phoneticSymbol : undefined,
    pronunciationUrl: draft.termType === "word" ? draft.pronunciationUrl : undefined,
    meanings: mergeBrowserMeaning(draft, chineseMeaning),
  };
}

export async function baiduBrowserTranslateTerm(draft: TermDraft, options: BaiduBrowserTranslateOptions = {}) {
  const response = options.translateInBrowser
    ? await options.translateInBrowser(draft.text)
    : await translateWithBaiduBrowser(draft.text, getTimeout(options));
  return parseBaiduBrowserTranslateResponse(response, draft);
}
