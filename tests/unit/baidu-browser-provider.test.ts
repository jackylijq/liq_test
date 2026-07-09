import { describe, expect, it, vi } from "vitest";
import { baiduBrowserTranslateTerm, parseBaiduBrowserTranslateResponse } from "@/lib/enrichment/baidu-browser-provider";

describe("parseBaiduBrowserTranslateResponse", () => {
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
