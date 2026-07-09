import { describe, expect, it, vi } from "vitest";
import { baiduTranslateEnrichTerm, buildBaiduTtsUrl, parseBaiduTranslateResponse } from "@/lib/enrichment/baidu-translate-provider";

describe("parseBaiduTranslateResponse", () => {
  it("parses Baidu web suggestion data without API keys", () => {
    const parsed = parseBaiduTranslateResponse(
      {
        errno: 0,
        data: [
          {
            k: "care",
            v: "n. 照顾，照料；小心，谨慎；关心 v. 关心，关怀；在乎，介意",
          },
        ],
      },
      { text: "care", termType: "word", meanings: [] },
    );

    expect(parsed.phoneticSymbol).toBeUndefined();
    expect(parsed.pronunciationUrl).toBe(buildBaiduTtsUrl("care"));
    expect(parsed.meanings).toMatchObject([
      { partOfSpeech: "noun", chineseMeaning: "照顾，照料；小心，谨慎；关心" },
      { partOfSpeech: "verb", chineseMeaning: "关心，关怀；在乎，介意" },
    ]);
  });

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

  it("parses Baidu text translation data for phrases", () => {
    const parsed = parseBaiduTranslateResponse(
      { trans_result: { data: [{ src: "Across the country", dst: "全国各地" }] } },
      { text: "Across the country", termType: "phrase", meanings: [] },
    );

    expect(parsed.meanings).toEqual([
      {
        chineseMeaning: "全国各地",
        fieldSources: { chineseMeaning: "web_lookup" },
      },
    ]);
  });
});

describe("baiduTranslateEnrichTerm", () => {
  it("calls the Baidu web endpoint without API keys and parses the response", async () => {
    const fetchMock = vi.fn(async () =>
      new Response(JSON.stringify({ trans_result: [{ dst: "照顾" }] }), {
        status: 200,
        headers: { "content-type": "application/json" },
      }),
    );

    const enriched = await baiduTranslateEnrichTerm(
      { text: "care", termType: "word", meanings: [] },
      {
        endpoint: "https://example.test/sug",
        fetchImpl: fetchMock,
      },
    );

    expect(fetchMock).toHaveBeenCalledOnce();
    const calls = fetchMock.mock.calls as unknown as [[string, RequestInit]];
    expect(calls[0][0]).toBe("https://example.test/sug");
    expect(calls[0][1].method).toBe("POST");
    expect(String(calls[0][1].body)).toContain("kw=care");
    expect(enriched.meanings[0].chineseMeaning).toBe("照顾");
  });

  it("falls back to Baidu text translation when suggestion data is empty", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ errno: 0, data: [] }), {
          status: 200,
          headers: { "content-type": "application/json" },
        }),
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ trans_result: { data: [{ dst: "全国各地" }] } }), {
          status: 200,
          headers: { "content-type": "application/json" },
        }),
      );

    const enriched = await baiduTranslateEnrichTerm(
      { text: "Across the country", termType: "phrase", meanings: [] },
      {
        endpoint: "https://example.test/sug",
        textEndpoint: "https://example.test/transapi",
        fetchImpl: fetchMock,
      },
    );

    expect(fetchMock).toHaveBeenCalledTimes(2);
    const calls = fetchMock.mock.calls as unknown as [[string, RequestInit], [string, RequestInit]];
    expect(calls[1][0]).toBe("https://example.test/transapi");
    expect(String(calls[1][1].body)).toContain("query=Across+the+country");
    expect(enriched.meanings[0].chineseMeaning).toBe("全国各地");
  });
});
