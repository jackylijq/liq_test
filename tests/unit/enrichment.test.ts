import { describe, expect, it } from "vitest";
import { enrichTermDraft } from "@/lib/enrichment/provider";
import { mockEnrichTerm } from "@/lib/enrichment/mock-provider";
import type { TermDraft } from "@/lib/types";

describe("mockEnrichTerm", () => {
  it("fills missing word fields", async () => {
    const draft: TermDraft = { text: "apple", termType: "word", meanings: [] };
    const enriched = await mockEnrichTerm(draft);
    expect(enriched.phoneticSymbol).toBeTruthy();
    expect(enriched.meanings[0].partOfSpeech).toBeTruthy();
    expect(enriched.meanings[0].chineseMeaning).toBeTruthy();
  });

  it("fills phrase usage context without phonetic symbol or part of speech", async () => {
    const draft: TermDraft = { text: "look after", termType: "phrase", meanings: [] };
    const enriched = await mockEnrichTerm(draft);
    expect(enriched.phoneticSymbol).toBeUndefined();
    expect(enriched.meanings[0].partOfSpeech).toBeUndefined();
    expect(enriched.meanings[0].usageContext).toContain("常用场景");
  });
});

describe("enrichTermDraft", () => {
  it("uses mock enrichment when no API key is configured", async () => {
    const enriched = await enrichTermDraft({ text: "bright", termType: "word", meanings: [] });
    expect(enriched.meanings[0].fieldSources.chineseMeaning).toBe("mock_generated");
  });
});
