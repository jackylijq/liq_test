import { describe, expect, it } from "vitest";
import { mergeTermDraft } from "@/lib/terms/merge";
import { normalizeTermText } from "@/lib/terms/normalize";
import type { TermDraft } from "@/lib/types";

describe("normalizeTermText", () => {
  it("lowercases latin text and collapses spaces", () => {
    expect(normalizeTermText("  Look   After  ")).toBe("look after");
  });
});

describe("mergeTermDraft", () => {
  it("preserves existing fields and appends new meanings", () => {
    const existing: TermDraft = {
      text: "run",
      termType: "word",
      meanings: [
        {
          partOfSpeech: "verb",
          chineseMeaning: "跑",
          exampleSentence: "I run every day.",
          explanation: "Move quickly on foot.",
          fieldSources: { chineseMeaning: "parsed" },
        },
      ],
    };

    const incoming: TermDraft = {
      text: "Run",
      termType: "word",
      meanings: [
        {
          partOfSpeech: "verb",
          chineseMeaning: "跑",
          exampleSentence: "She can run fast.",
          explanation: "Generated text must not replace parsed fields.",
          fieldSources: { chineseMeaning: "ai_generated" },
        },
        {
          partOfSpeech: "noun",
          chineseMeaning: "一段路程",
          exampleSentence: "The morning run is short.",
          explanation: "A period of running.",
          fieldSources: { chineseMeaning: "parsed" },
        },
      ],
    };

    const merged = mergeTermDraft(existing, incoming);
    expect(merged.meanings).toHaveLength(2);
    expect(merged.meanings[0].exampleSentence).toBe("I run every day.");
    expect(merged.meanings[1].chineseMeaning).toBe("一段路程");
  });

  it("keeps phrases free of phonetic symbols and parts of speech", () => {
    const phrase: TermDraft = {
      text: "look after",
      termType: "phrase",
      meanings: [
        {
          chineseMeaning: "照顾",
          usageContext: "Used when caring for people, animals, or things.",
          fieldSources: { chineseMeaning: "parsed" },
        },
      ],
    };

    const merged = mergeTermDraft(undefined, phrase);
    expect(merged.meanings[0].partOfSpeech).toBeUndefined();
    expect(merged.phoneticSymbol).toBeUndefined();
  });
});
