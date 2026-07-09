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
  pron: "pronoun",
  conj: "conjunction",
  interj: "interjection",
  modal: "modal",
  phrase: "phrase",
};

type ParseMode = "word" | "phrase" | "sentence" | "ignore";

type ParseContext = {
  mode?: ParseMode;
  partOfSpeech?: string;
};

function detectTermType(text: string, explicitPartOfSpeech?: string, forcedMode?: ParseMode): TermType {
  if (forcedMode === "phrase" || explicitPartOfSpeech === "phrase") return "phrase";
  if (forcedMode === "word" && (explicitPartOfSpeech || !text.trim().includes(" "))) return "word";
  return text.trim().includes(" ") ? "phrase" : "word";
}

function normalizePartToken(token: string): string {
  return token.replace(/[.*]/g, "").toLowerCase();
}

function parsePartToken(token: string): string[] {
  return token
    .split("&")
    .map(normalizePartToken)
    .map((part) => partOfSpeechMap[part])
    .filter((part): part is string => Boolean(part));
}

function formatPartOfSpeech(parts: string[]): string | undefined {
  const unique = [...new Set(parts)];
  return unique.length ? unique.join("/") : undefined;
}

function findPartOfSpeechSpan(parts: string[]) {
  const start = parts.findIndex((part) => parsePartToken(part).length > 0);
  if (start < 0) return undefined;

  const parsedParts: string[] = [];
  let end = start;
  while (end < parts.length) {
    const parsed = parsePartToken(parts[end]);
    if (parsed.length === 0) break;
    parsedParts.push(...parsed);
    end += 1;
  }

  return {
    start,
    end,
    partOfSpeech: formatPartOfSpeech(parsedParts),
  };
}

function firstChineseIndex(parts: string[]): number {
  const index = parts.findIndex((part) => /[\u4e00-\u9fa5]/.test(part));
  return index >= 0 ? index : parts.length;
}

function stripMarkdownListPrefix(line: string) {
  return line.replace(/^\s*[-*]\s+/, "").trim();
}

function parseLine(line: string, context: ParseContext = {}): TermDraft | undefined {
  const trimmed = stripMarkdownListPrefix(line);
  if (!trimmed) return undefined;
  if (/^#{1,6}\s/.test(trimmed) || /^-{3,}$/.test(trimmed) || /^\*\*.*\*\*$/.test(trimmed)) {
    return undefined;
  }

  const phoneticMatch = trimmed.match(/(\/[^/]+\/|\[[^\]]+\])/);
  const phoneticSymbol = phoneticMatch?.[0];
  const withoutPhonetic = phoneticSymbol ? trimmed.replace(phoneticSymbol, " ").trim() : trimmed;
  const sentenceMatch = withoutPhonetic.match(/([A-Z][^。！？.!?]*[。！？.!?])$/);
  const exampleSentence = sentenceMatch?.[1]?.trim();
  const withoutSentence = exampleSentence ? withoutPhonetic.replace(exampleSentence, " ").trim() : withoutPhonetic;
  const parts = withoutSentence.split(/\s+/);
  const partSpan = findPartOfSpeechSpan(parts);
  const explicitPartOfSpeech = partSpan?.partOfSpeech;
  const partOfSpeech = explicitPartOfSpeech ?? context.partOfSpeech;
  const termParts =
    partSpan && partSpan.start > 0 ? parts.slice(0, partSpan.start) : parts.slice(0, Math.max(1, firstChineseIndex(parts)));
  const text = termParts.join(" ").trim();
  if (!text) return undefined;

  const meaningStart = partSpan ? partSpan.end : termParts.length;
  const meaningText = parts.slice(meaningStart).join(" ").trim();
  const chineseMeaning = meaningText.match(/[\u4e00-\u9fa5][\u4e00-\u9fa5；，、\s]*/)?.[0]?.trim() ?? "";
  const termType = detectTermType(text, explicitPartOfSpeech ?? context.partOfSpeech, context.mode);
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

function classifyHeading(line: string): ParseMode | undefined {
  const heading = line.replace(/^#{1,6}\s*/, "").replace(/^[一二三四五六七八九十]+[、.．]\s*/, "").trim();
  if (/句型|句式/.test(heading)) return "sentence";
  if (/词性变化|词形变化|词形转换|词形|单词变形|单词变化/.test(heading)) return "ignore";
  if (/短语|词块/.test(heading)) return "phrase";
  if (/单词|词汇/.test(heading)) return "word";
  return undefined;
}

function parsePartHeading(line: string): string | undefined {
  const text = line.replace(/\*/g, "").trim();
  if (/多重词性词/.test(text)) return undefined;
  if (/Adverb|副词/i.test(text)) return "adverb";
  if (/Adjective|形容词/i.test(text)) return "adjective";
  if (/Verb|动词/i.test(text)) return "verb";
  if (/Noun|名词/i.test(text)) return "noun";
  return undefined;
}

function dedupeRows(rows: TermDraft[]) {
  const seen = new Set<string>();
  return rows.filter((row) => {
    const key = `${row.termType}:${row.text.trim().toLowerCase()}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export function parseImportedText(text: string): TermDraft[] {
  const rows: TermDraft[] = [];
  const context: ParseContext = {};

  for (const rawLine of text.split(/\r?\n/).flatMap((line) => line.split(/\t(?=[A-Za-z])/))) {
    const line = rawLine.trim();
    if (!line) continue;
    if (/^-{3,}$/.test(line)) continue;

    if (/^#{1,6}\s/.test(line)) {
      context.mode = classifyHeading(line);
      context.partOfSpeech = undefined;
      continue;
    }

    if (/^\*\*.*\*\*$/.test(line)) {
      context.partOfSpeech = context.mode === "word" ? parsePartHeading(line) : undefined;
      continue;
    }

    if (context.mode === "sentence" || context.mode === "ignore") continue;

    const row = parseLine(line, context);
    if (row?.text) rows.push(row);
  }

  return dedupeRows(rows);
}
