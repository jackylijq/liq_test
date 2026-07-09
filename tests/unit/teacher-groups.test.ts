import { describe, expect, it } from "vitest";
import { selectTeacherGroup, sortTeacherTermsForEnrichment, summarizeTeacherTerms } from "@/lib/teacher/groups";

describe("selectTeacherGroup", () => {
  const groups = [
    { id: "g1", name: "1年级上册", sortOrder: 1 },
    { id: "g2", name: "1年级下册", sortOrder: 2 },
  ];

  it("uses the selected group when it exists", () => {
    expect(selectTeacherGroup(groups, "g2")?.id).toBe("g2");
  });

  it("falls back to the first ordered group", () => {
    expect(selectTeacherGroup(groups, "missing")?.id).toBe("g1");
  });
});

describe("summarizeTeacherTerms", () => {
  it("splits word and phrase counts and detects missing fields", () => {
    const summary = summarizeTeacherTerms([
      {
        termType: "word",
        meanings: [{ chineseMeaning: "苹果", exampleSentence: null, usageContext: null }],
      },
      {
        termType: "phrase",
        meanings: [{ chineseMeaning: "", exampleSentence: "Look at me.", usageContext: "" }],
      },
    ]);

    expect(summary).toEqual({
      wordCount: 1,
      phraseCount: 1,
      sentenceCount: 0,
      missingFieldCount: 3,
    });
  });
});

describe("sortTeacherTermsForEnrichment", () => {
  it("puts terms with no visible Chinese meaning first", () => {
    const sorted = sortTeacherTermsForEnrichment([
      {
        id: "with-chinese",
        text: "banana",
        termType: "word",
        meanings: [{ chineseMeaning: "香蕉", fieldSourcesJson: "{}" }],
      },
      {
        id: "mock-chinese",
        text: "care",
        termType: "word",
        meanings: [{ chineseMeaning: "care 的中文意思", fieldSourcesJson: '{"chineseMeaning":"mock_generated"}' }],
      },
      {
        id: "no-meaning",
        text: "across the country",
        termType: "phrase",
        meanings: [],
      },
    ]);

    expect(sorted.map((term) => term.id)).toEqual(["no-meaning", "mock-chinese", "with-chinese"]);
  });
});
