import type { TermDraft } from "@/lib/types";
import { choosePhoneticSymbol, isPlaceholderPhonetic } from "@/lib/terms/phonetics";

type FetchLike = typeof fetch;

type DictionaryPhonetic = {
  text?: string;
};

type DictionaryEntry = {
  phonetic?: string;
  phonetics?: DictionaryPhonetic[];
};

type DictionaryPhoneticOptions = {
  endpoint?: string;
  fetchImpl?: FetchLike;
};

const defaultEndpoint = "https://api.dictionaryapi.dev/api/v2/entries/en";

export function parseDictionaryPhoneticResponse(response: unknown) {
  const entries = Array.isArray(response) ? (response as DictionaryEntry[]) : [];
  for (const entry of entries) {
    const phonetics = [entry.phonetic, ...(entry.phonetics ?? []).map((item) => item.text)];
    const phonetic = phonetics.map((item) => item?.trim()).find((item): item is string => Boolean(item));
    if (phonetic) return phonetic;
  }
  return undefined;
}

function canLookupDictionaryPhonetic(draft: TermDraft) {
  return (
    draft.termType === "word" &&
    /^[A-Za-z][A-Za-z'-]*$/.test(draft.text.trim()) &&
    (!draft.phoneticSymbol || isPlaceholderPhonetic(draft.text, draft.phoneticSymbol))
  );
}

export async function enrichDictionaryPhonetic(draft: TermDraft, options: DictionaryPhoneticOptions = {}) {
  if (!canLookupDictionaryPhonetic(draft)) {
    return {
      ...draft,
      phoneticSymbol: draft.termType === "word" ? choosePhoneticSymbol(draft.text, draft.phoneticSymbol, undefined) ?? undefined : undefined,
    };
  }

  try {
    const endpoint = options.endpoint ?? defaultEndpoint;
    const response = await (options.fetchImpl ?? fetch)(`${endpoint}/${encodeURIComponent(draft.text.trim().toLowerCase())}`, {
      headers: { "User-Agent": "Mozilla/5.0" },
    });
    if (!response.ok) throw new Error(`Dictionary phonetic lookup failed with status ${response.status}`);
    const phoneticSymbol = choosePhoneticSymbol(draft.text, draft.phoneticSymbol, parseDictionaryPhoneticResponse(await response.json())) ?? undefined;
    return { ...draft, phoneticSymbol };
  } catch {
    return {
      ...draft,
      phoneticSymbol: choosePhoneticSymbol(draft.text, draft.phoneticSymbol, undefined) ?? undefined,
    };
  }
}
