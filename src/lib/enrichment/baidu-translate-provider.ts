import { createHash } from "node:crypto";
import type { MeaningDraft, TermDraft, TermType } from "@/lib/types";

type FetchLike = typeof fetch;

type BaiduTranslateOptions = {
  appId?: string;
  secretKey?: string;
  endpoint?: string;
  fetchImpl?: FetchLike;
};

type BaiduPart = {
  part?: string;
  means?: string[];
};

type BaiduResponse = {
  trans_result?: { dst?: string }[];
  dict_result?: {
    simple_means?: {
      symbols?: {
        ph_en?: string;
        ph_am?: string;
        parts?: BaiduPart[];
      }[];
    };
  };
  liju_result?: {
    double?: unknown[];
  };
};

const defaultEndpoint = "https://fanyi-api.baidu.com/api/trans/vip/translate";

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

function normalizePartOfSpeech(part: string | undefined) {
  if (!part) return undefined;
  const normalized = part.replace(/[.。]/g, "").trim().toLowerCase();
  return partOfSpeechMap[normalized] ?? normalized;
}

function wrapPhonetic(value: string | undefined) {
  const trimmed = value?.trim();
  if (!trimmed) return undefined;
  if (trimmed.startsWith("/") || trimmed.startsWith("[")) return trimmed;
  return `/${trimmed}/`;
}

function firstTranslation(response: BaiduResponse) {
  return response.trans_result?.map((item) => item.dst?.trim()).find(Boolean);
}

function normalizeExamplePair(pair: unknown) {
  if (Array.isArray(pair)) {
    const source = typeof pair[0] === "string" ? pair[0].trim() : "";
    const translation = typeof pair[1] === "string" ? pair[1].trim() : "";
    return source ? { source, translation } : undefined;
  }

  if (pair && typeof pair === "object") {
    const record = pair as Record<string, unknown>;
    const source = typeof record.src === "string" ? record.src.trim() : typeof record.source === "string" ? record.source.trim() : "";
    const translation =
      typeof record.dst === "string" ? record.dst.trim() : typeof record.translation === "string" ? record.translation.trim() : "";
    return source ? { source, translation } : undefined;
  }

  return undefined;
}

function extractExamples(response: BaiduResponse) {
  return (response.liju_result?.double ?? []).map(normalizeExamplePair).filter((item): item is { source: string; translation: string } => Boolean(item));
}

function fieldSources(): MeaningDraft["fieldSources"] {
  return { chineseMeaning: "web_lookup" };
}

function meaningFromTranslation(draft: TermDraft, translation: string): MeaningDraft {
  const base: MeaningDraft = {
    chineseMeaning: translation,
    fieldSources: fieldSources(),
  };

  if (draft.termType === "sentence") {
    return {
      ...base,
      exampleSentence: draft.text,
      fieldSources: { ...base.fieldSources, exampleSentence: "parsed" },
    };
  }

  return base;
}

function mergeParsedMeanings(draft: TermDraft, generated: MeaningDraft[]) {
  if (!draft.meanings.length) return generated;
  if (!generated.length) return draft.meanings;

  return generated.map((meaning, index) => {
    const existing = draft.meanings[index] ?? draft.meanings.find((item) => item.partOfSpeech === meaning.partOfSpeech);
    if (!existing) return meaning;
    return {
      ...meaning,
      chineseMeaning: existing.chineseMeaning.trim() || meaning.chineseMeaning,
      exampleSentence: existing.exampleSentence ?? meaning.exampleSentence,
      explanation: existing.explanation ?? meaning.explanation,
      usageContext: existing.usageContext ?? meaning.usageContext,
      fieldSources: {
        ...meaning.fieldSources,
        ...existing.fieldSources,
        chineseMeaning: existing.chineseMeaning.trim() ? existing.fieldSources.chineseMeaning : meaning.fieldSources.chineseMeaning,
      },
    };
  });
}

function parseDictionaryMeanings(response: BaiduResponse, termType: TermType) {
  if (termType !== "word") return [];

  const parts = response.dict_result?.simple_means?.symbols?.flatMap((symbol) => symbol.parts ?? []) ?? [];
  const examples = extractExamples(response);
  return parts
    .map((part, index): MeaningDraft | undefined => {
      const chineseMeaning = (part.means ?? []).map((item) => item.trim()).filter(Boolean).join("；");
      if (!chineseMeaning) return undefined;

      const example = examples[index] ?? examples[0];
      return {
        partOfSpeech: normalizePartOfSpeech(part.part),
        chineseMeaning,
        exampleSentence: example?.source,
        explanation: example?.translation,
        fieldSources: {
          partOfSpeech: part.part ? "web_lookup" : undefined,
          chineseMeaning: "web_lookup",
          exampleSentence: example?.source ? "web_lookup" : undefined,
          explanation: example?.translation ? "web_lookup" : undefined,
        },
      };
    })
    .filter((item): item is MeaningDraft => Boolean(item));
}

export function buildBaiduTtsUrl(text: string) {
  const encoded = encodeURIComponent(text);
  return `https://fanyi.baidu.com/gettts?lan=en&text=${encoded}&spd=3&source=web`;
}

export function parseBaiduTranslateResponse(response: unknown, draft: TermDraft): TermDraft {
  const baiduResponse = response as BaiduResponse;
  const translation = firstTranslation(baiduResponse);
  const dictionaryMeanings = parseDictionaryMeanings(baiduResponse, draft.termType);
  const examples = extractExamples(baiduResponse);
  const generatedMeanings = dictionaryMeanings.length
    ? dictionaryMeanings
    : translation
      ? [meaningFromTranslation(draft, translation)]
      : [];

  const meanings = mergeParsedMeanings(draft, generatedMeanings).map((meaning, index) => {
    const example = examples[index] ?? examples[0];
    if (meaning.exampleSentence || !example) return meaning;
    return {
      ...meaning,
      exampleSentence: example.source,
      explanation: meaning.explanation ?? example.translation,
      fieldSources: {
        ...meaning.fieldSources,
        exampleSentence: "web_lookup" as const,
        explanation: example.translation ? ("web_lookup" as const) : meaning.fieldSources.explanation,
      },
    };
  });

  const symbol = baiduResponse.dict_result?.simple_means?.symbols?.[0];
  const phoneticSymbol = draft.termType === "word" ? (draft.phoneticSymbol ?? wrapPhonetic(symbol?.ph_en ?? symbol?.ph_am)) : undefined;

  return {
    ...draft,
    phoneticSymbol,
    pronunciationUrl: draft.termType === "word" ? (draft.pronunciationUrl ?? buildBaiduTtsUrl(draft.text)) : undefined,
    meanings: meanings.length ? meanings : draft.meanings,
  };
}

function sign(appId: string, query: string, salt: string, secretKey: string) {
  return createHash("md5").update(`${appId}${query}${salt}${secretKey}`).digest("hex");
}

export async function baiduTranslateEnrichTerm(draft: TermDraft, options: BaiduTranslateOptions = {}): Promise<TermDraft> {
  const appId = options.appId ?? process.env.BAIDU_TRANSLATE_APP_ID;
  const secretKey = options.secretKey ?? process.env.BAIDU_TRANSLATE_SECRET_KEY;
  const endpoint = options.endpoint ?? process.env.BAIDU_TRANSLATE_ENDPOINT ?? defaultEndpoint;
  if (!appId || !secretKey) {
    throw new Error("BAIDU_TRANSLATE_APP_ID and BAIDU_TRANSLATE_SECRET_KEY are not configured");
  }

  const salt = Date.now().toString();
  const params = new URLSearchParams({
    q: draft.text,
    from: "en",
    to: "zh",
    appid: appId,
    salt,
    sign: sign(appId, draft.text, salt, secretKey),
  });

  const response = await (options.fetchImpl ?? fetch)(`${endpoint}?${params.toString()}`);
  if (!response.ok) {
    throw new Error(`Baidu translate failed with status ${response.status}`);
  }

  return parseBaiduTranslateResponse(await response.json(), draft);
}
