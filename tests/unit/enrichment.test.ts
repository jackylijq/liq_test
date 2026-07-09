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

  it("fills missing Chinese meaning and example sentence on parsed word meanings", async () => {
    const draft: TermDraft = {
      text: "fox",
      termType: "word",
      meanings: [{ partOfSpeech: "noun", chineseMeaning: "", fieldSources: { partOfSpeech: "parsed" } }],
    };
    const enriched = await mockEnrichTerm(draft);
    expect(enriched.meanings[0].partOfSpeech).toBe("noun");
    expect(enriched.meanings[0].chineseMeaning).toBe("fox 的中文意思");
    expect(enriched.meanings[0].exampleSentence).toBe("This is an example sentence for fox.");
    expect(enriched.meanings[0].fieldSources.chineseMeaning).toBe("mock_generated");
  });

  it("does not invent phrase usage context when it is missing", async () => {
    const draft: TermDraft = {
      text: "look after",
      termType: "phrase",
      meanings: [{ chineseMeaning: "照顾", fieldSources: { chineseMeaning: "parsed" } }],
    };
    const enriched = await mockEnrichTerm(draft);
    expect(enriched.phoneticSymbol).toBeUndefined();
    expect(enriched.meanings[0].partOfSpeech).toBeUndefined();
    expect(enriched.meanings[0].chineseMeaning).toBe("照顾");
    expect(enriched.meanings[0].usageContext).toBeUndefined();
  });
});

describe("enrichTermDraft", () => {
  it("uses mock enrichment when no API key is configured", async () => {
    const enriched = await enrichTermDraft({ text: "bright", termType: "word", meanings: [] });
    expect(enriched.meanings[0].fieldSources.chineseMeaning).toBe("mock_generated");
  });
});
