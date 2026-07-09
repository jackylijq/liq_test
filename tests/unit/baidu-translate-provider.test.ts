import { describe, expect, it, vi } from "vitest";
import { baiduTranslateEnrichTerm, buildBaiduTtsUrl, parseBaiduTranslateResponse } from "@/lib/enrichment/baidu-translate-provider";

describe("parseBaiduTranslateResponse", () => {
  it("parses rich word dictionary data with phonetic, meanings, and examples", () => {
    const parsed = parseBaiduTranslateResponse(
      {
        trans_result: [{ dst: "关心；照顾" }],
        dict_result: {
          simple_means: {
            symbols: [
              {
                ph_en: "keə(r)",
                parts: [
                  { part: "n.", means: ["照顾，照料", "小心，谨慎"] },
                  { part: "v.", means: ["关心，关怀", "在乎，介意"] },
                ],
              },
            ],
          },
        },
        liju_result: {
          double: [
            ["She shows great care for her students.", "她非常关心学生。"],
            ["I don't care what they think.", "我不在意他们的想法。"],
          ],
        },
      },
      { text: "care", termType: "word", meanings: [] },
    );

    expect(parsed.phoneticSymbol).toBe("/keə(r)/");
    expect(parsed.pronunciationUrl).toBe(buildBaiduTtsUrl("care"));
    expect(parsed.meanings).toMatchObject([
      { partOfSpeech: "noun", chineseMeaning: "照顾，照料；小心，谨慎", exampleSentence: "She shows great care for her students." },
      { partOfSpeech: "verb", chineseMeaning: "关心，关怀；在乎，介意", exampleSentence: "I don't care what they think." },
    ]);
    expect(parsed.meanings[0].fieldSources.chineseMeaning).toBe("web_lookup");
  });

  it("uses general translation text for sentences", () => {
    const parsed = parseBaiduTranslateResponse(
      { trans_result: [{ dst: "这个动物的尾巴长吗？" }] },
      { text: "Is the tail of this animal long?", termType: "sentence", meanings: [{ chineseMeaning: "", fieldSources: {} }] },
    );

    expect(parsed.phoneticSymbol).toBeUndefined();
    expect(parsed.pronunciationUrl).toBeUndefined();
    expect(parsed.meanings).toEqual([
      {
        chineseMeaning: "这个动物的尾巴长吗？",
        exampleSentence: "Is the tail of this animal long?",
        fieldSources: {
          chineseMeaning: "web_lookup",
          exampleSentence: "parsed",
        },
      },
    ]);
  });
});

describe("baiduTranslateEnrichTerm", () => {
  it("calls the configured Baidu endpoint and parses the response", async () => {
    const fetchMock = vi.fn(async () =>
      new Response(JSON.stringify({ trans_result: [{ dst: "照顾" }] }), {
        status: 200,
        headers: { "content-type": "application/json" },
      }),
    );

    const enriched = await baiduTranslateEnrichTerm(
      { text: "care", termType: "word", meanings: [] },
      {
        appId: "appid",
        secretKey: "secret",
        endpoint: "https://example.test/translate",
        fetchImpl: fetchMock,
      },
    );

    expect(fetchMock).toHaveBeenCalledOnce();
    const calls = fetchMock.mock.calls as unknown as [[string]];
    expect(calls[0][0]).toContain("https://example.test/translate?");
    expect(enriched.meanings[0].chineseMeaning).toBe("照顾");
  });
});
