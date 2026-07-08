import type { FieldSource, TermDraft, TermType } from "@/lib/types";

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
  phrase: "phrase",
};

function detectTermType(text: string, explicitPartOfSpeech?: string): TermType {
  if (explicitPartOfSpeech === "phrase") return "phrase";
  return text.trim().includes(" ") ? "phrase" : "word";
}

function normalizePartToken(token: string): string {
  return token.replace(".", "").toLowerCase();
}

function firstChineseIndex(parts: string[]): number {
  const index = parts.findIndex((part) => /[\u4e00-\u9fa5]/.test(part));
  return index >= 0 ? index : parts.length;
}

function parseLine(line: string): TermDraft | undefined {
  const trimmed = line.trim();
  if (!trimmed) return undefined;

  const phoneticMatch = trimmed.match(/(\/[^/]+\/|\[[^\]]+\])/);
  const phoneticSymbol = phoneticMatch?.[0];
  const withoutPhonetic = phoneticSymbol ? trimmed.replace(phoneticSymbol, " ").trim() : trimmed;
  const sentenceMatch = withoutPhonetic.match(/([A-Z][^。！？.!?]*[。！？.!?])$/);
  const exampleSentence = sentenceMatch?.[1]?.trim();
  const withoutSentence = exampleSentence ? withoutPhonetic.replace(exampleSentence, " ").trim() : withoutPhonetic;
  const parts = withoutSentence.split(/\s+/);
  const posIndex = parts.findIndex((part) => partOfSpeechMap[normalizePartToken(part)]);
  const rawPartOfSpeech = posIndex >= 0 ? normalizePartToken(parts[posIndex]) : undefined;
  const partOfSpeech = rawPartOfSpeech ? partOfSpeechMap[rawPartOfSpeech] : undefined;
  const termParts = posIndex >= 0 ? parts.slice(0, posIndex) : parts.slice(0, Math.max(1, firstChineseIndex(parts)));
  const text = termParts.join(" ").trim();
  if (!text) return undefined;

  const meaningStart = posIndex >= 0 ? posIndex + 1 : termParts.length;
  const meaningText = parts.slice(meaningStart).join(" ").trim();
  const chineseMeaning = meaningText.match(/[\u4e00-\u9fa5][\u4e00-\u9fa5；，、\s]*/)?.[0]?.trim() ?? meaningText;
  const termType = detectTermType(text, rawPartOfSpeech);
  const fieldSource: FieldSource = "parsed";

  return {
    text,
    termType,
    phoneticSymbol: termType === "word" ? phoneticSymbol : undefined,
    meanings: [
      {
        partOfSpeech: termType === "word" ? partOfSpeech : undefined,
        chineseMeaning,
        exampleSentence,
        fieldSources: {
          partOfSpeech: partOfSpeech ? fieldSource : undefined,
          chineseMeaning: chineseMeaning ? fieldSource : undefined,
          exampleSentence: exampleSentence ? fieldSource : undefined,
        },
      },
    ],
  };
}

export function parseImportedText(text: string): TermDraft[] {
  return text
    .split(/\r?\n/)
    .flatMap((line) => line.split(/\t(?=[A-Za-z])/))
    .map(parseLine)
    .filter((row): row is TermDraft => Boolean(row?.text));
}
