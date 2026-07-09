import { describe, expect, it } from "vitest";
import { buildEnrichmentPrompt } from "@/lib/enrichment/openai-provider";

describe("buildEnrichmentPrompt", () => {
  it("asks the API to translate sentence meanings without word-only fields", () => {
    const prompt = buildEnrichmentPrompt({
      text: "I like the way they walk.",
      termType: "sentence",
      meanings: [],
    });

    expect(prompt).toContain("句型");
    expect(prompt).toContain("中文翻译");
    expect(prompt).toContain("不要返回 phoneticSymbol");
    expect(prompt).toContain("不要返回 partOfSpeech");
  });

  it("asks the API to keep phrase usage context optional", () => {
    const prompt = buildEnrichmentPrompt({
      text: "be good for",
      termType: "phrase",
      meanings: [{ chineseMeaning: "对有好处", fieldSources: { chineseMeaning: "parsed" } }],
    });

    expect(prompt).toContain("短语或固定搭配");
    expect(prompt).toContain("常用场景");
    expect(prompt).toContain("没有可靠场景时不要返回 usageContext");
  });
});
