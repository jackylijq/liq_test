import { describe, expect, it, vi } from "vitest";
import type { TermDraft } from "@/lib/types";

vi.mock("@/lib/enrichment/baidu-translate-provider", () => ({
  baiduTranslateEnrichTerm: vi.fn(async (draft: TermDraft) => ({
    ...draft,
    meanings: [{ chineseMeaning: "短释义", fieldSources: { chineseMeaning: "web_lookup" } }],
  })),
}));

vi.mock("@/lib/enrichment/baidu-browser-provider", () => ({
  baiduBrowserTranslateTerm: vi.fn(async (draft: TermDraft) => ({
    ...draft,
    meanings: [{ chineseMeaning: "全国各地", fieldSources: { chineseMeaning: "web_lookup" } }],
  })),
}));

describe("enrichTermDraft browser fallback", () => {
  it("uses browser-session Baidu translation during manual enrichment even when HTTP Baidu has a short meaning", async () => {
    const { enrichTermDraft } = await import("@/lib/enrichment/provider");
    const { baiduBrowserTranslateTerm } = await import("@/lib/enrichment/baidu-browser-provider");

    const enriched = await enrichTermDraft(
      {
        text: "Across the country",
        termType: "phrase",
        meanings: [],
      },
      { useBrowser: true },
    );

    expect(baiduBrowserTranslateTerm).toHaveBeenCalledOnce();
    expect(enriched.meanings[0].chineseMeaning).toBe("全国各地");
    expect(enriched.meanings[0].fieldSources.chineseMeaning).toBe("web_lookup");
    expect(enriched.meanings[0].exampleSentence).toBe('Please use "Across the country" in a simple sentence.');
  });
});
