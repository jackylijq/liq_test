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

function getFieldSources(meaning: DisplayMeaning) {
  if (meaning.fieldSources) return meaning.fieldSources;
  if (!meaning.fieldSourcesJson) return {};

  try {
    return JSON.parse(meaning.fieldSourcesJson) as { chineseMeaning?: string };
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
  return !(termType === "sentence" && sentence === termText.trim());
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
