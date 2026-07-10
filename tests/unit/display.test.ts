import { describe, expect, it } from "vitest";
import {
  formatChineseMeaningLine,
  formatExplanationLines,
  getVisibleExampleSentences,
  getVisibleExplanationLines,
  getVisibleExplanations,
  formatPartOfSpeech,
  getMeaningLines,
  shouldShowExplanation,
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

  it("collects unique examples and hides mock explanations", () => {
    const meanings = [
      {
        chineseMeaning: "照顾",
        exampleSentence: "She shows great care for her students.",
        explanation: "care is used as a common English word.",
        fieldSourcesJson: '{"explanation":"mock_generated"}',
      },
      {
        chineseMeaning: "关心",
        exampleSentence: "She shows great care for her students.",
        explanation: "用于表示关心或照顾。",
        fieldSourcesJson: '{"explanation":"web_lookup"}',
      },
    ];

    expect(getVisibleExampleSentences("word", "care", meanings)).toEqual(["She shows great care for her students."]);
    expect(shouldShowExplanation(meanings[0])).toBe(false);
    expect(getVisibleExplanations(meanings)).toEqual(["用于表示关心或照顾。"]);
  });

  it("formats long explanations into semantic lines", () => {
    const explanation =
      "“care”这个词在中文里可以有多种译法，具体取决于语境。常见的翻译包括“关心”、“照顾”、“在意”、“小心”等。例如： 表示情感关注时，如“I care about you.”可译为“我关心你。” 表示照料时，如“She takes care of children.”可译为“她照顾孩子。” 特殊搭配： \"health care\" → 医疗/保健 \"take care\" → 保重/当心 注意：动词形态常译为\"在乎/关心\"。";

    expect(formatExplanationLines(explanation)).toEqual([
      "“care”这个词在中文里可以有多种译法，具体取决于语境。常见的翻译包括“关心”、“照顾”、“在意”、“小心”等。例如：",
      "表示情感关注时，如“I care about you.”可译为“我关心你。”",
      "表示照料时，如“She takes care of children.”可译为“她照顾孩子。”",
      "特殊搭配：",
      "\"health care\" → 医疗/保健",
      "\"take care\" → 保重/当心",
      "注意：动词形态常译为\"在乎/关心\"。",
    ]);
  });

  it("returns visible explanation lines", () => {
    expect(
      getVisibleExplanationLines([
        {
          chineseMeaning: "照顾",
          explanation: "关心（最常见译法） 例：She shows great care for her students.（她非常关心学生）",
          fieldSourcesJson: '{"explanation":"web_lookup"}',
        },
      ]),
    ).toEqual(["关心（最常见译法）", "例：She shows great care for her students.（她非常关心学生）"]);
  });

  it("hides mock-generated examples from old enrichment results", () => {
    expect(
      getVisibleExampleSentences("phrase", "Across the country", [
        {
          chineseMeaning: "Across the country 的中文意思",
          exampleSentence: 'Please use "Across the country" in a simple sentence.',
          fieldSourcesJson: '{"chineseMeaning":"mock_generated","exampleSentence":"mock_generated"}',
        },
        {
          chineseMeaning: "在全国各地；遍及全国",
          fieldSourcesJson: '{"chineseMeaning":"web_lookup"}',
        },
      ]),
    ).toEqual([]);
  });
});
