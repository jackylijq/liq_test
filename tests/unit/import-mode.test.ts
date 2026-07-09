import { describe, expect, it } from "vitest";
import { buildSupplementDrafts, getTeacherImportMode } from "@/lib/import/import-mode";
import type { TermDraft } from "@/lib/types";

describe("getTeacherImportMode", () => {
  it("uses markdown and text files as source imports", () => {
    expect(getTeacherImportMode("words.md", "")).toBe("source");
    expect(getTeacherImportMode("words.txt", "text/plain")).toBe("source");
  });

  it("uses pdf and word files as supplemental imports", () => {
    expect(getTeacherImportMode("answers.pdf", "application/pdf")).toBe("supplement");
    expect(getTeacherImportMode("answers.docx", "application/vnd.openxmlformats-officedocument.wordprocessingml.document")).toBe(
      "supplement",
    );
  });
});

describe("buildSupplementDrafts", () => {
  it("keeps only rows that match existing terms and preserves existing term type", () => {
    const parsedRows: TermDraft[] = [
      {
        text: "fox",
        termType: "word",
        meanings: [{ chineseMeaning: "狐狸", partOfSpeech: "noun", fieldSources: { chineseMeaning: "parsed" } }],
      },
      {
        text: "take care of",
        termType: "phrase",
        meanings: [{ chineseMeaning: "照顾；处理", fieldSources: { chineseMeaning: "parsed" } }],
      },
      {
        text: "Unit1AnimalFriends",
        termType: "word",
        meanings: [{ chineseMeaning: "", fieldSources: {} }],
      },
      {
        text: "quite",
        termType: "phrase",
        meanings: [{ chineseMeaning: "相当；非常", fieldSources: { chineseMeaning: "parsed" } }],
      },
    ];

    const matched = buildSupplementDrafts(parsedRows, [
      { text: "fox", normalizedText: "fox", termType: "word" },
      { text: "take care of", normalizedText: "take care of", termType: "phrase" },
      { text: "quite", normalizedText: "quite", termType: "word" },
    ]);

    expect(matched.map((row) => ({ text: row.text, type: row.termType, meaning: row.meanings[0]?.chineseMeaning }))).toEqual([
      { text: "fox", type: "word", meaning: "狐狸" },
      { text: "take care of", type: "phrase", meaning: "照顾；处理" },
      { text: "quite", type: "word", meaning: "相当；非常" },
    ]);
  });

  it("matches sentence supplements and keeps them free of word-only fields", () => {
    const matched = buildSupplementDrafts(
      [
        {
          text: "I like the way they walk.",
          termType: "phrase",
          phoneticSymbol: "/bad/",
          meanings: [{ chineseMeaning: "我喜欢它们走路的方式", partOfSpeech: "noun", fieldSources: { chineseMeaning: "parsed" } }],
        },
      ],
      [{ text: "I like the way they walk.", normalizedText: "i like the way they walk.", termType: "sentence" }],
    );

    expect(matched).toEqual([
      {
        text: "I like the way they walk.",
        normalizedText: "i like the way they walk.",
        termType: "sentence",
        phoneticSymbol: undefined,
        meanings: [{ chineseMeaning: "我喜欢它们走路的方式", fieldSources: { chineseMeaning: "parsed" } }],
      },
    ]);
  });

  it("uses translated sentence rows from supplement imports", () => {
    const matched = buildSupplementDrafts(
      [
        {
          text: "Why do you like penguins so much?",
          termType: "sentence",
          meanings: [
            {
              chineseMeaning: "你为什么这么喜欢企鹅",
              exampleSentence: "Why do you like penguins so much?",
              fieldSources: { chineseMeaning: "parsed", exampleSentence: "parsed" },
            },
          ],
        },
      ],
      [
        {
          text: "Why do you like penguins so much?",
          normalizedText: "why do you like penguins so much?",
          termType: "sentence",
        },
      ],
    );

    expect(matched[0]).toMatchObject({
      text: "Why do you like penguins so much?",
      termType: "sentence",
      meanings: [{ chineseMeaning: "你为什么这么喜欢企鹅" }],
    });
    expect(matched[0].meanings[0].partOfSpeech).toBeUndefined();
    expect(matched[0].phoneticSymbol).toBeUndefined();
  });
});
