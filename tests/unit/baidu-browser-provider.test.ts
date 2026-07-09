import { describe, expect, it, vi } from "vitest";
import { baiduBrowserTranslateTerm, parseBaiduBrowserTranslateResponse } from "@/lib/enrichment/baidu-browser-provider";

describe("parseBaiduBrowserTranslateResponse", () => {
  it("parses browser v2Fetch word phonetics and part-of-speech meanings", () => {
    const parsed = parseBaiduBrowserTranslateResponse(
      {
        status: 0,
        result: JSON.stringify({
          content: [
            {
              mean: [
                {
                  pre: "n.",
                  cont: {
                    "照顾，照料": 0,
                    "保养，护理": 0,
                    "小心，谨慎": 0,
                    关心: 0,
                  },
                },
                {
                  pre: "v.",
                  cont: {
                    "关心，关怀": 0,
                    "在乎，介意": 0,
                    担忧: 0,
                  },
                },
              ],
            },
          ],
          voice: [{ en_phonic: "[keə(r)]" }, { us_phonic: "[ker]" }],
          src: "care",
        }),
      },
      { text: "care", termType: "word", meanings: [] },
    );

    expect(parsed.phoneticSymbol).toBe("英/[keə(r)]/ 美/[ker]/");
    expect(parsed.pronunciationUrl).toContain("text=care");
    expect(parsed.meanings).toMatchObject([
      {
        partOfSpeech: "noun",
        chineseMeaning: "照顾，照料；保养，护理；小心，谨慎；关心",
        fieldSources: { partOfSpeech: "web_lookup", chineseMeaning: "web_lookup" },
      },
      {
        partOfSpeech: "verb",
        chineseMeaning: "关心，关怀；在乎，介意；担忧",
        fieldSources: { partOfSpeech: "web_lookup", chineseMeaning: "web_lookup" },
      },
    ]);
  });

  it("parses browser v2Fetch phrase meanings", () => {
    const parsed = parseBaiduBrowserTranslateResponse(
      {
        status: 0,
        result: JSON.stringify({
          content: [
            {
              mean: [
                {
                  cont: {
                    在全国各地: 0,
                    遍及全国: 0,
                  },
                },
              ],
            },
          ],
          src: "Across the country",
        }),
      },
      { text: "Across the country", termType: "phrase", meanings: [] },
    );

    expect(parsed.meanings).toEqual([
      {
        chineseMeaning: "在全国各地；遍及全国",
        fieldSources: { chineseMeaning: "web_lookup" },
      },
    ]);
  });
});

describe("baiduBrowserTranslateTerm", () => {
  it("uses the browser-session translator and parses the result", async () => {
    const translateInBrowser = vi.fn(async () => ({
      status: 0,
      result: JSON.stringify({
        content: [{ mean: [{ cont: { 全国各地: 0 } }] }],
      }),
    }));

    const translated = await baiduBrowserTranslateTerm(
      { text: "Across the country", termType: "phrase", meanings: [] },
      { translateInBrowser },
    );

    expect(translateInBrowser).toHaveBeenCalledWith("Across the country");
    expect(translated.meanings[0].chineseMeaning).toBe("全国各地");
  });
});
