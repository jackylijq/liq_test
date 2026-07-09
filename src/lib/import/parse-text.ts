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

function stripNumberPrefix(line: string) {
  return line.replace(/^\d+[.．]\s*/, "").trim();
}

function stripMarkdownListPrefix(line: string) {
  return line.replace(/^\s*[-*]\s+/, "").trim();
}

const compactPhraseWords = [
  "something",
  "someone",
  "different",
  "symbol",
  "another",
  "example",
  "school",
  "uniform",
  "country",
  "because",
  "about",
  "course",
  "thanks",
  "answer",
  "phone",
  "quiet",
  "clean",
  "rules",
  "queue",
  "absent",
  "noise",
  "belong",
  "running",
  "working",
  "weekends",
  "weekdays",
  "doubles",
  "jogging",
  "exercise",
  "healthy",
  "progress",
  "spirit",
  "promise",
  "surprise",
  "succeed",
  "instead",
  "laugh",
  "search",
  "raise",
  "hand",
  "put",
  "sbs",
  "ones",
  "care",
  "take",
  "come",
  "from",
  "keep",
  "warm",
  "good",
  "look",
  "like",
  "black",
  "white",
  "made",
  "part",
  "danger",
  "down",
  "much",
  "with",
  "walk",
  "safe",
  "late",
  "time",
  "treat",
  "hand",
  "have",
  "turn",
  "feel",
  "well",
  "seat",
  "belt",
  "make",
  "bed",
  "hang",
  "focus",
  "think",
  "hurry",
  "class",
  "finish",
  "homework",
  "become",
  "person",
  "show",
  "respect",
  "build",
  "world",
  "better",
  "watch",
  "fight",
  "help",
  "work",
  "team",
  "field",
  "fields",
  "tricks",
  "try",
  "best",
  "once",
  "upon",
  "long",
  "tell",
  "truth",
  "money",
  "over",
  "away",
  "only",
  "free",
  "end",
  "in",
  "the",
  "sea",
  "be",
  "for",
  "a",
  "of",
  "and",
  "not",
  "at",
  "all",
  "play",
  "to",
  "on",
  "up",
  "out",
  "sb",
  "sth",
  "do",
  "doing",
  "as",
  "is",
  "my",
  "own",
  "get",
  "along",
  "ask",
];

const compactPhraseMap: Record<string, string> = {
  acrosscountry: "across country",
  acrossthecountry: "across the country",
  afewminutesago: "a few minutes ago",
  agreewith: "agree with",
  anexercisemat: "an exercise mat",
  apairofgloves: "a pair of gloves",
  apairofrunningshoes: "a pair of running shoes",
  atennisracket: "a tennis racket",
  atthebeach: "at the beach",
  atthemoment: "at the moment",
  atthestart: "at the start",
  befilledwith: "be filled with",
  befullof: "be full of",
  beinterestedin: "be interested in",
  beonholiday: "be on holiday",
  beasymbolof: "be a symbol of",
  beindanger: "be in danger",
  bemadeof: "be made of",
  bepartof: "be part of",
  carryanumbrella: "carry an umbrella",
  comefrom: "come from",
  cutdown: "cut down",
  cutdownon: "cut down on",
  doindooractivities: "do indoor activities",
  dontfeelwell: "don't feel well",
  encouragesbtodosth: "encourage sb to do sth",
  enjoydoingsomething: "enjoy doing something",
  fishandchips: "fish and chips",
  freshvegetables: "fresh vegetables",
  fullofenergy: "full of energy",
  givedirections: "give directions",
  gojogging: "go jogging",
  goonatrip: "go on a trip",
  gotoanexhibition: "go to an exhibition",
  getalongwith: "get along with",
  hardlyever: "hardly ever",
  havesthincommon: "have sth in common",
  hidefromtherain: "hide from the rain",
  hurrytosp: "hurry to sp",
  inaway: "in a way",
  inhighspirits: "in high spirits",
  introuble: "in trouble",
  jumpthequeue: "jump the queue",
  keepbalanceddiet: "keep balanced diet",
  keepwarm: "keep warm",
  learnabout: "learn about",
  learnfrom: "learn from",
  lookdifferentfrom: "look different from",
  lookoutofthewindow: "look out of the window",
  makegreatprogressin: "make great progress in",
  makenoise: "make noise",
  makeonesown: "make one's own",
  makesbsbed: "make sb's bed",
  myownclothes: "my own clothes",
  notatall: "not at all",
  onceuponatime: "once upon a time",
  onandoffthefields: "on and off the fields",
  oneanother: "one another",
  overthere: "over there",
  packaraincoat: "pack a raincoat",
  playbeachvolleyball: "play beach volleyball",
  pickup: "pick up",
  playwithsomeone: "play with someone",
  practicethepiano: "practice the piano",
  practisedoingsth: "practise doing sth",
  putonseatbelt: "put on seat belt",
  putup: "put up",
  raincatsanddogs: "rain cats and dogs",
  rainheavily: "rain heavily",
  rainorshine: "rain or shine",
  raiseoneshand: "raise one's hand",
  recordfeelings: "record feelings",
  staysafe: "stay safe",
  takecareof: "take care of",
  takephotos: "take photos",
  thedaybeforeyesterday: "the day before yesterday",
  tomatoplants: "tomato plants",
  toomuch: "too much",
  turnoff: "turn off",
  visitamuseum: "visit a museum",
  walktoschool: "walk to school",
  walkthedog: "walk the dog",
  waterplants: "water plants",
  watertheplants: "water the plants",
  wearschooluniform: "wear school uniform",
  weartheschooluniform: "wear the school uniform",
  westernfood: "Western food",
  workasateam: "work as a team",
  writedown: "write down",
};

function splitCompactEnglish(text: string): string {
  if (text.includes("/")) {
    return text
      .split("/")
      .map((part) => splitCompactEnglish(part))
      .join("/");
  }

  const source = text.toLowerCase().replace(/[’']/g, "");
  if (compactPhraseMap[source]) return compactPhraseMap[source];

  const words = [...compactPhraseWords].sort((a, b) => b.length - a.length);
  const result: string[] = [];
  let index = 0;

  while (index < source.length) {
    const matched = words.find((word) => source.startsWith(word, index));
    if (!matched) return text;
    result.push(matched);
    index += matched.length;
  }

  return result
    .map((word) => {
      if (word === "sbs") return "sb's";
      if (word === "ones") return "one's";
      return word;
    })
    .join(" ");
}

function cleanChineseMeaning(text: string) {
  return text
    .replace(/\([^)]*\)/g, "")
    .replace(/(?:modal|interj|conj|prep|pron|adj|adv|n|v)\./gi, "；")
    .replace(/[.．]+/g, "")
    .replace(/；+/g, "；")
    .replace(/^；|；$/g, "")
    .trim();
}

function parseCompactLine(line: string, context: ParseContext): TermDraft | undefined {
  const compact = stripNumberPrefix(stripMarkdownListPrefix(line)).trim();
  if (!compact || !/[A-Za-z]/.test(compact)) return undefined;
  if (/^(modal|interj|conj|prep|pron|adj|adv|n|v)\./i.test(compact)) return undefined;

  const fieldSource: FieldSource = "parsed";

  if (context.mode === "phrase") {
    const chineseFirst = compact.match(/^(.+?)([A-Za-z][A-Za-z.'-]*)$/);
    if (chineseFirst && /[\u4e00-\u9fa5]/.test(chineseFirst[1])) {
      return {
        text: splitCompactEnglish(chineseFirst[2]),
        termType: "phrase",
        meanings: [
          {
            chineseMeaning: cleanChineseMeaning(chineseFirst[1]),
            fieldSources: { chineseMeaning: fieldSource },
          },
        ],
      };
    }

    const englishFirst = compact.match(/^([A-Za-z][A-Za-z./'’-]*)([\u4e00-\u9fa5].*)?$/);
    if (englishFirst) {
      return {
        text: splitCompactEnglish(englishFirst[1]),
        termType: "phrase",
        meanings: [
          {
            chineseMeaning: cleanChineseMeaning(englishFirst[2] ?? ""),
            fieldSources: englishFirst[2] ? { chineseMeaning: fieldSource } : {},
          },
        ],
      };
    }
  }

  if (context.mode === "word") {
    const englishFirst = compact.match(/^([A-Za-z]+?)(modal|interj|conj|prep|pron|adj|adv|n|v)\.(.*)$/i);
    if (englishFirst) {
      const inlineParts = [partOfSpeechMap[normalizePartToken(englishFirst[2])]];
      const restParts = [...englishFirst[3].matchAll(/(?:^|[\u4e00-\u9fa5；，、])(modal|interj|conj|prep|pron|adj|adv|n|v)\./gi)]
        .map((match) => partOfSpeechMap[normalizePartToken(match[1])])
        .filter((part): part is string => Boolean(part));
      const partOfSpeech = formatPartOfSpeech([...inlineParts, ...restParts].filter(Boolean));

      return {
        text: englishFirst[1],
        termType: "word",
        meanings: [
          {
            partOfSpeech,
            chineseMeaning: cleanChineseMeaning(englishFirst[3]),
            fieldSources: {
              partOfSpeech: partOfSpeech ? fieldSource : undefined,
              chineseMeaning: fieldSource,
            },
          },
        ],
      };
    }

    const compactPhrase = compact.match(/^([A-Za-z][A-Za-z./'’-]*)([\u4e00-\u9fa5].*)$/);
    if (compactPhrase) {
      const phraseText = splitCompactEnglish(compactPhrase[1]);
      if (phraseText.includes(" ") || phraseText.includes("/")) {
        return {
          text: phraseText,
          termType: "phrase",
          meanings: [
            {
              chineseMeaning: cleanChineseMeaning(compactPhrase[2]),
              fieldSources: { chineseMeaning: fieldSource },
            },
          ],
        };
      }
    }

    const chineseFirst = compact.match(/^(.+?)([A-Za-z]+)$/);
    if (chineseFirst && /[\u4e00-\u9fa5]/.test(chineseFirst[1])) {
      return {
        text: chineseFirst[2],
        termType: "word",
        meanings: [
          {
            partOfSpeech: context.partOfSpeech,
            chineseMeaning: cleanChineseMeaning(chineseFirst[1]),
            fieldSources: {
              partOfSpeech: context.partOfSpeech ? fieldSource : undefined,
              chineseMeaning: fieldSource,
            },
          },
        ],
      };
    }
  }

  return undefined;
}

function parseLine(line: string, context: ParseContext = {}): TermDraft | undefined {
  const trimmed = stripNumberPrefix(stripMarkdownListPrefix(line));
  if (!trimmed) return undefined;
  if (/^#{1,6}\s/.test(trimmed) || /^-{3,}$/.test(trimmed) || /^\*\*.*\*\*$/.test(trimmed)) {
    return undefined;
  }
  if (!/[A-Za-z]/.test(trimmed)) return undefined;
  if (/^(modal|interj|conj|prep|pron|adj|adv|n|v)\./i.test(trimmed)) return undefined;

  const compact = parseCompactLine(trimmed, context);
  if (compact) return compact;

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

function classifyPlainLine(line: string): ParseMode | "skip" | undefined {
  const heading = line.replace(/^-/, "").replace(/^[一二三四五六七八九十]+[、.．]\s*/, "").trim();
  if (/校本教材/.test(heading)) return "skip";
  if (/^Unit\d+/i.test(heading)) return "skip";
  if (/^Section[A-Z]/i.test(heading)) return "skip";
  return classifyHeading(heading);
}

function parsePartHeading(line: string): string | undefined {
  const text = line.replace(/\*/g, "").replace(/^-/, "").trim();
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

    if (/^\*\*.*\*\*$/.test(line) || /^-(?:Verb|Noun|Adjective|Adverb|多重词性词)/i.test(line)) {
      context.partOfSpeech = context.mode === "word" ? parsePartHeading(line) : undefined;
      continue;
    }

    const plainMode = classifyPlainLine(line);
    if (plainMode) {
      if (plainMode !== "skip") {
        context.mode = plainMode;
      }
      context.partOfSpeech = undefined;
      continue;
    }

    if (context.mode === "sentence" || context.mode === "ignore") continue;

    const row = parseLine(line, context);
    if (row?.text) rows.push(row);
  }

  return dedupeRows(rows);
}
