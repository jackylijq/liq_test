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
  exampleSentence?: string | null;
  explanation?: string | null;
  fieldSources?: { chineseMeaning?: string; explanation?: string; exampleSentence?: string };
  fieldSourcesJson?: string | null;
};

function getFieldSources(meaning: DisplayMeaning): NonNullable<DisplayMeaning["fieldSources"]> {
  if (meaning.fieldSources) return meaning.fieldSources;
  if (!meaning.fieldSourcesJson) return {};

  try {
    return JSON.parse(meaning.fieldSourcesJson) as NonNullable<DisplayMeaning["fieldSources"]>;
  } catch {
    return {};
  }
}

function isPlaceholderChineseMeaning(meaning: DisplayMeaning, termText?: string) {
  const chineseMeaning = meaning.chineseMeaning.trim();
  if (!chineseMeaning) return true;

  const fieldSources = getFieldSources(meaning);
  if (fieldSources.chineseMeaning === "mock_generated") return true;

  return Boolean(termText?.trim() && chineseMeaning === `${termText.trim()} 的中文意思`);
}

export function formatChineseMeaningLine(termType: TermType | string, meaning: DisplayMeaning, termText?: string) {
  if (isPlaceholderChineseMeaning(meaning, termText)) return "";
  const chineseMeaning = meaning.chineseMeaning.trim();
  const partOfSpeech = formatPartOfSpeech(meaning.partOfSpeech);
  return termType === "word" && partOfSpeech ? `${partOfSpeech}：${chineseMeaning}` : chineseMeaning;
}

export function getMeaningLines(termType: TermType | string, meanings: DisplayMeaning[], termText?: string) {
  return [...new Set(meanings.map((meaning) => formatChineseMeaningLine(termType, meaning, termText)).filter(Boolean))];
}

export function shouldShowExampleSentence(termType: TermType | string, termText: string, exampleSentence?: string | null) {
  const sentence = exampleSentence?.trim();
  if (!sentence) return false;
  if (isPlaceholderExampleSentence(sentence)) return false;
  return !(termType === "sentence" && sentence === termText.trim());
}

export function isPlaceholderExampleSentence(sentence: string) {
  return /^Please use ".+" in a simple sentence\.$/.test(sentence.trim());
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

export function shouldShowExplanation(meaning: { explanation?: string | null; fieldSources?: { explanation?: string }; fieldSourcesJson?: string | null }) {
  if (!meaning.explanation?.trim()) return false;
  if (meaning.fieldSources?.explanation) return meaning.fieldSources.explanation !== "mock_generated";
  if (!meaning.fieldSourcesJson) return true;

  try {
    const fieldSources = JSON.parse(meaning.fieldSourcesJson) as { explanation?: string };
    return fieldSources.explanation !== "mock_generated";
  } catch {
    return true;
  }
}

export function getVisibleExampleSentences(termType: TermType | string, termText: string, meanings: DisplayMeaning[]) {
  const examples = meanings
    .filter((meaning) => getFieldSources(meaning).exampleSentence !== "mock_generated")
    .map((meaning) => meaning.exampleSentence?.trim())
    .filter((sentence): sentence is string => Boolean(sentence && shouldShowExampleSentence(termType, termText, sentence)));
  return [...new Set(examples)];
}

export function getVisibleExplanations(meanings: DisplayMeaning[]) {
  const explanations = meanings
    .filter((meaning) => shouldShowExplanation(meaning))
    .map((meaning) => meaning.explanation?.trim())
    .filter((explanation): explanation is string => Boolean(explanation));
  return [...new Set(explanations)];
}

export function formatExplanationLines(explanation: string) {
  const normalized = explanation
    .trim()
    .replace(/\r\n?/g, "\n")
    .replace(/\s*(表示情感关注时，如)/g, "\n$1")
    .replace(/\s*(表示照料时，如)/g, "\n$1")
    .replace(/\s*(表示谨慎时，如)/g, "\n$1")
    .replace(/\s*(表示在意某事时，如)/g, "\n$1")
    .replace(/\s*(此外，)/g, "\n$1")
    .replace(/\s*(关心（最常见译法）)/g, "\n$1")
    .replace(/\s*(照顾\/照料（侧重具体行为）)/g, "\n$1")
    .replace(/\s*(在意\/介意（含情感倾向）)/g, "\n$1")
    .replace(/\s*(谨慎\/小心（名词用法）)/g, "\n$1")
    .replace(/\s*(忧虑（古语用法）)/g, "\n$1")
    .replace(/\s*(特殊搭配：)/g, "\n$1")
    .replace(/\s*("health care"\s*→)/g, "\n$1")
    .replace(/\s*("take care"\s*→)/g, "\n$1")
    .replace(/\s*("child care"\s*→)/g, "\n$1")
    .replace(/\s*(注意：)/g, "\n$1")
    .replace(/\s*(例：)/g, "\n$1")
    .replace(/\n{3,}/g, "\n\n");

  return normalized.split(/\n+/).map((line) => line.trim()).filter(Boolean);
}

export function getVisibleExplanationLines(meanings: DisplayMeaning[]) {
  const lines = getVisibleExplanations(meanings).flatMap(formatExplanationLines);
  return [...new Set(lines)];
}
