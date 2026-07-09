import type { TermType } from "@/lib/types";

const partAbbreviations: Record<string, string> = {
  noun: "n.",
  verb: "v.",
  adjective: "adj.",
  adverb: "adv.",
  preposition: "prep.",
  pronoun: "pron.",
  conjunction: "conj.",
  interjection: "interj.",
  modal: "modal.",
};

export function formatPartOfSpeech(partOfSpeech: string | null | undefined) {
  if (!partOfSpeech) return "";
  return partOfSpeech
    .split("/")
    .map((part) => partAbbreviations[part.trim()] ?? part.trim())
    .join("/");
}

type DisplayMeaning = {
  partOfSpeech?: string | null;
  chineseMeaning: string;
};

export function formatChineseMeaningLine(termType: TermType | string, meaning: DisplayMeaning) {
  const chineseMeaning = meaning.chineseMeaning.trim();
  if (!chineseMeaning) return "";
  const partOfSpeech = formatPartOfSpeech(meaning.partOfSpeech);
  return termType === "word" && partOfSpeech ? `${partOfSpeech}：${chineseMeaning}` : chineseMeaning;
}

export function getMeaningLines(termType: TermType | string, meanings: DisplayMeaning[]) {
  return meanings.map((meaning) => formatChineseMeaningLine(termType, meaning)).filter(Boolean);
}

export function shouldShowUsageContext(meaning: { usageContext?: string | null; fieldSourcesJson?: string | null }) {
  if (!meaning.usageContext?.trim()) return false;
  if (!meaning.fieldSourcesJson) return true;

  try {
    const fieldSources = JSON.parse(meaning.fieldSourcesJson) as { usageContext?: string };
    return fieldSources.usageContext !== "mock_generated";
  } catch {
    return true;
  }
}
