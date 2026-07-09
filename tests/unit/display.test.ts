import { describe, expect, it } from "vitest";
import {
  formatChineseMeaningLine,
  formatPartOfSpeech,
  getMeaningLines,
  shouldShowExampleSentence,
  shouldShowUsageContext,
} from "@/lib/terms/display";

describe("term display formatting", () => {
  it("uses short part-of-speech labels for word meanings", () => {
    expect(formatPartOfSpeech("noun/verb")).toBe("n./v.");
    expect(formatChineseMeaningLine("word", { partOfSpeech: "noun", chineseMeaning: "好处" })).toBe("n.：好处");
  });

  it("shows phrase and sentence meanings without part-of-speech prefixes", () => {
    expect(formatChineseMeaningLine("phrase", { chineseMeaning: "对有好处" })).toBe("对有好处");
    expect(formatChineseMeaningLine("sentence", { chineseMeaning: "我喜欢它们走路的方式" })).toBe("我喜欢它们走路的方式");
  });

  it("filters empty meanings", () => {
    expect(
      getMeaningLines("word", [
        { partOfSpeech: "noun", chineseMeaning: "" },
        { partOfSpeech: "verb", chineseMeaning: "照顾" },
      ]),
    ).toEqual(["v.：照顾"]);
  });

  it("filters mock placeholder Chinese meanings", () => {
    expect(
      getMeaningLines(
        "word",
        [
          {
            partOfSpeech: "noun/verb",
            chineseMeaning: "care 的中文意思",
            fieldSourcesJson: '{"chineseMeaning":"mock_generated"}',
          },
        ],
        "care",
      ),
    ).toEqual([]);
  });

  it("hides mock-generated usage context but keeps imported usage context", () => {
    expect(shouldShowUsageContext({ usageContext: "" })).toBe(false);
    expect(shouldShowUsageContext({ usageContext: "常用场景：日常表达", fieldSourcesJson: '{"usageContext":"mock_generated"}' })).toBe(false);
    expect(shouldShowUsageContext({ usageContext: "常用场景：日常表达", fieldSourcesJson: '{"usageContext":"parsed"}' })).toBe(true);
  });

  it("does not show a sentence example when it repeats the term text", () => {
    expect(shouldShowExampleSentence("sentence", "I like the way they walk.", "I like the way they walk.")).toBe(false);
    expect(shouldShowExampleSentence("word", "care", "Take care of yourself.")).toBe(true);
  });
});
