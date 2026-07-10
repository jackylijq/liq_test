import { describe, expect, it, vi } from "vitest";
import { enrichDictionaryPhonetic, parseDictionaryPhoneticResponse } from "@/lib/enrichment/dictionary-provider";

describe("parseDictionaryPhoneticResponse", () => {
  it("extracts the first available phonetic text", () => {
    expect(
      parseDictionaryPhoneticResponse([
        {
          phonetics: [{ text: "/ˈiːɡəl/" }],
        },
      ]),
    ).toBe("/ˈiːɡəl/");
  });
});

describe("enrichDictionaryPhonetic", () => {
  it("replaces placeholder phonetics with dictionary phonetics", async () => {
    const fetchMock = vi.fn(async () => new Response(JSON.stringify([{ phonetics: [{ text: "/ˈiːɡəl/" }] }])));

    const enriched = await enrichDictionaryPhonetic(
      {
        text: "eagle",
        termType: "word",
        phoneticSymbol: "/eagle/",
        meanings: [{ chineseMeaning: "鹰", fieldSources: { chineseMeaning: "web_lookup" } }],
      },
      { endpoint: "https://example.test/en", fetchImpl: fetchMock },
    );

    expect(fetchMock).toHaveBeenCalledWith("https://example.test/en/eagle", {
      headers: { "User-Agent": "Mozilla/5.0" },
    });
    expect(enriched.phoneticSymbol).toBe("/ˈiːɡəl/");
  });

  it("clears placeholder phonetics when lookup fails", async () => {
    const fetchMock = vi.fn(async () => new Response("not found", { status: 404 }));

    const enriched = await enrichDictionaryPhonetic(
      {
        text: "eagle",
        termType: "word",
        phoneticSymbol: "/eagle/",
        meanings: [{ chineseMeaning: "鹰", fieldSources: { chineseMeaning: "web_lookup" } }],
      },
      { endpoint: "https://example.test/en", fetchImpl: fetchMock },
    );

    expect(enriched.phoneticSymbol).toBeUndefined();
  });

  it("does not replace existing real phonetics", async () => {
    const fetchMock = vi.fn();

    const enriched = await enrichDictionaryPhonetic(
      {
        text: "eagle",
        termType: "word",
        phoneticSymbol: "英/ˈiːɡl/ 美/ˈiːɡl/",
        meanings: [{ chineseMeaning: "鹰", fieldSources: { chineseMeaning: "web_lookup" } }],
      },
      { endpoint: "https://example.test/en", fetchImpl: fetchMock },
    );

    expect(fetchMock).not.toHaveBeenCalled();
    expect(enriched.phoneticSymbol).toBe("英/ˈiːɡl/ 美/ˈiːɡl/");
  });
});
