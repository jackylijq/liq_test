import type { MeaningDraft, TermDraft, TermType } from "@/lib/types";

type FetchLike = typeof fetch;

type BaiduTranslateOptions = {
  endpoint?: string;
  textEndpoint?: string;
  fetchImpl?: FetchLike;
};

type BaiduPart = {
  part?: string;
  means?: string[];
};

type BaiduResponse = {
  errno?: number;
  data?: { k?: string; v?: string }[];
  trans_result?: { dst?: string }[] | { data?: { src?: string; dst?: string }[] };
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

const defaultEndpoint = "https://fanyi.baidu.com/sug";
const defaultTextEndpoint = "https://fanyi.baidu.com/transapi";

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

function getTextTranslationItems(response: BaiduResponse) {
  if (Array.isArray(response.trans_result)) return response.trans_result;
  return response.trans_result?.data ?? [];
}

function firstTranslation(response: BaiduResponse) {
  return getTextTranslationItems(response).map((item) => item.dst?.trim()).find(Boolean) ?? response.data?.map((item) => item.v?.trim()).find(Boolean);
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
    const existingHasVisibleChinese = hasVisibleChineseMeaning(draft.text, existing);
    return {
      ...meaning,
      chineseMeaning: existingHasVisibleChinese ? existing.chineseMeaning : meaning.chineseMeaning,
      exampleSentence: existing.exampleSentence ?? meaning.exampleSentence,
      explanation: existing.explanation ?? meaning.explanation,
      usageContext: existing.usageContext ?? meaning.usageContext,
      fieldSources: {
        ...meaning.fieldSources,
        ...existing.fieldSources,
        chineseMeaning: existingHasVisibleChinese ? existing.fieldSources.chineseMeaning : meaning.fieldSources.chineseMeaning,
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

function parseDictionaryMeanings(response: BaiduResponse, termType: TermType): MeaningDraft[] {
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

function parseSuggestionMeanings(response: BaiduResponse, draft: TermDraft): MeaningDraft[] {
  if (draft.termType !== "word") return [];

  const raw = response.data?.find((item) => item.k?.trim().toLowerCase() === draft.text.trim().toLowerCase())?.v?.trim() ?? response.data?.[0]?.v?.trim();
  if (!raw) return [];

  const markerPattern = /(modal|interj|conj|prep|pron|adj|adv|n|v)\./gi;
  const markers = [...raw.matchAll(markerPattern)];
  if (!markers.length) {
    return [
      {
        chineseMeaning: raw,
        fieldSources: { chineseMeaning: "web_lookup" },
      },
    ];
  }

  const meanings: MeaningDraft[] = markers
    .map((marker, index): MeaningDraft | undefined => {
      const start = (marker.index ?? 0) + marker[0].length;
      const end = markers[index + 1]?.index ?? raw.length;
      const chineseMeaning = raw.slice(start, end).replace(/[;；\s]+$/g, "").trim();
      if (!chineseMeaning) return undefined;

      const partOfSpeech = normalizePartOfSpeech(marker[1]);
      return {
        partOfSpeech,
        chineseMeaning,
        fieldSources: {
          partOfSpeech: partOfSpeech ? "web_lookup" : undefined,
          chineseMeaning: "web_lookup",
        },
      };
    })
    .filter((item): item is MeaningDraft => Boolean(item));
  return meanings;
}

export function buildBaiduTtsUrl(text: string) {
  const encoded = encodeURIComponent(text);
  return `https://fanyi.baidu.com/gettts?lan=en&text=${encoded}&spd=3&source=web`;
}

export function parseBaiduTranslateResponse(response: unknown, draft: TermDraft): TermDraft {
  const baiduResponse = response as BaiduResponse;
  const translation = firstTranslation(baiduResponse);
  const dictionaryMeanings = parseDictionaryMeanings(baiduResponse, draft.termType);
  const suggestionMeanings = parseSuggestionMeanings(baiduResponse, draft);
  const examples = extractExamples(baiduResponse);
  let generatedMeanings: MeaningDraft[] = [];
  if (dictionaryMeanings.length) {
    generatedMeanings = dictionaryMeanings;
  } else if (suggestionMeanings.length) {
    generatedMeanings = suggestionMeanings;
  } else if (translation) {
    generatedMeanings = [meaningFromTranslation(draft, translation)];
  }

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

  const pronunciationUrl = draft.termType === "word" ? (draft.pronunciationUrl ?? buildBaiduTtsUrl(draft.text)) : undefined;

  return {
    ...draft,
    phoneticSymbol,
    pronunciationUrl,
    meanings: meanings.length ? meanings : draft.meanings,
  };
}

async function postBaiduForm(endpoint: string, body: URLSearchParams, fetchImpl: FetchLike) {
  const response = await fetchImpl(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
      Referer: "https://fanyi.baidu.com/",
      "User-Agent": "Mozilla/5.0",
    },
    body,
  });
  if (!response.ok) {
    throw new Error(`Baidu web translate failed with status ${response.status}`);
  }
  return response.json();
}

function hasWebLookupMeaning(draft: TermDraft) {
  return draft.meanings.some((meaning) => meaning.chineseMeaning.trim() && meaning.fieldSources.chineseMeaning === "web_lookup");
}

export async function baiduTranslateEnrichTerm(draft: TermDraft, options: BaiduTranslateOptions = {}): Promise<TermDraft> {
  const fetchImpl = options.fetchImpl ?? fetch;
  const endpoint = options.endpoint ?? process.env.BAIDU_TRANSLATE_WEB_ENDPOINT ?? defaultEndpoint;
  let firstError: unknown;
  let suggestionDraft: TermDraft | undefined;

  try {
    suggestionDraft = parseBaiduTranslateResponse(await postBaiduForm(endpoint, new URLSearchParams({ kw: draft.text }), fetchImpl), draft);
    if (hasWebLookupMeaning(suggestionDraft)) return suggestionDraft;
  } catch (error) {
    firstError = error;
  }

  const textEndpoint = options.textEndpoint ?? process.env.BAIDU_TRANSLATE_TEXT_ENDPOINT ?? defaultTextEndpoint;
  try {
    const textDraft = parseBaiduTranslateResponse(
      await postBaiduForm(
        textEndpoint,
        new URLSearchParams({
          from: "en",
          to: "zh",
          query: draft.text,
          source: "txt",
        }),
        fetchImpl,
      ),
      draft,
    );
    if (hasWebLookupMeaning(textDraft)) return textDraft;
  } catch (error) {
    if (!suggestionDraft && firstError) throw firstError;
    if (!suggestionDraft) throw error;
  }

  return suggestionDraft ?? draft;
}
