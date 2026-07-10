import { afterEach, describe, expect, it, vi } from "vitest";
import {
  baiduBrowserTranslateTerm,
  buildBaiduTranslatePageUrl,
  parseBaiduBrowserTranslateResponse,
  parseBaiduRenderedPageText,
} from "@/lib/enrichment/baidu-browser-provider";

describe("buildBaiduTranslatePageUrl", () => {
  it("opens Baidu text translation with the real query in the URL", () => {
    expect(buildBaiduTranslatePageUrl("Across the country")).toBe(
      "https://fanyi.baidu.com/mtpe-individual/transText?query=Across%20the%20country&lang=en2zh&ext_channel=pcPinzhuan#/",
    );
  });
});

describe("parseBaiduRenderedPageText", () => {
  it("converts rendered word dictionary text into a browser response", () => {
    const response = parseBaiduRenderedPageText(
      [
        "AI大模型翻译",
        "关心",
        "编辑译文",
        "段落对照",
        "\"care\" 这个词在中文里可以有多种译法。",
        "试一试：",
        "简明释义牛津词典",
        "care",
        "英/keə(r)/",
        "美/ker/",
        "n.",
        "照顾，照料；小心，谨慎",
        "v.",
        "（对……）关心，关怀；在乎，介意",
        "第三人称单数：cares",
      ].join("\n"),
      "care",
    );

    const parsed = parseBaiduBrowserTranslateResponse(response, { text: "care", termType: "word", meanings: [] });

    expect(parsed.phoneticSymbol).toBe("英/keə(r)/ 美/ker/");
    expect(parsed.meanings[0]).toMatchObject({
      partOfSpeech: "noun",
      chineseMeaning: "照顾，照料；小心，谨慎",
      explanation: expect.stringContaining("\"care\" 这个词在中文里可以有多种译法。"),
    });
    expect(parsed.meanings[1]).toMatchObject({
      partOfSpeech: "verb",
      chineseMeaning: "（对……）关心，关怀；在乎，介意",
    });
  });

  it("converts rendered phrase dictionary text into a browser response", () => {
    const response = parseBaiduRenderedPageText(
      [
        "AI大模型翻译",
        "全国各地",
        "编辑译文",
        "段落对照",
        "\"Across the country\" 这个短语通常表示遍及全国。",
        "试一试：",
        "简明释义例句",
        "Across the country",
        "英/əˈkrɒs ðə ˈkʌntri/",
        "美/əˈkrɔːs ðə ˈkʌntri/",
        "网络",
        "在全国各地；遍及全国",
        "例句",
      ].join("\n"),
      "Across the country",
    );

    const parsed = parseBaiduBrowserTranslateResponse(response, { text: "Across the country", termType: "phrase", meanings: [] });

    expect(parsed.meanings[0]).toMatchObject({
      chineseMeaning: "在全国各地；遍及全国",
      explanation: expect.stringContaining("通常表示遍及全国"),
      fieldSources: { chineseMeaning: "web_lookup", explanation: "web_lookup" },
    });
  });

  it("does not treat product promotion text as a primary translation", () => {
    const response = parseBaiduRenderedPageText(
      [
        "AI大模型翻译",
        "AI论文精翻",
        "像读中文论文一样",
        "读英文论文",
        "AI译后编辑",
      ].join("\n"),
      "—Where are they from? —It says Antarctica.",
    );

    const parsed = parseBaiduBrowserTranslateResponse(response, {
      text: "—Where are they from? —It says Antarctica.",
      termType: "sentence",
      meanings: [{ chineseMeaning: "", fieldSources: {} }],
    });

    expect(parsed.meanings[0].chineseMeaning).toBe("");
  });
});

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
        explanation: expect.stringContaining("She shows great care for her students."),
        fieldSources: { partOfSpeech: "web_lookup", chineseMeaning: "web_lookup" },
      },
      {
        partOfSpeech: "verb",
        chineseMeaning: "关心，关怀；在乎，介意；担忧",
        fieldSources: { partOfSpeech: "web_lookup", chineseMeaning: "web_lookup" },
      },
    ]);
    expect(parsed.meanings[0].explanation).toContain("health care");
    expect(parsed.meanings[0].explanation).toContain("couldn't care less");
  });

  it("replaces placeholder phonetic symbols with browser phonetics", () => {
    const parsed = parseBaiduBrowserTranslateResponse(
      {
        status: 0,
        result: JSON.stringify({
          content: [{ mean: [{ pre: "n.", cont: { 关心: 0 } }] }],
          voice: [{ en_phonic: "[keə(r)]" }, { us_phonic: "[ker]" }],
          src: "care",
        }),
      },
      { text: "care", termType: "word", phoneticSymbol: "/care/", meanings: [] },
    );

    expect(parsed.phoneticSymbol).toBe("英/[keə(r)]/ 美/[ker]/");
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

  it("replaces mock placeholder phrase meanings with browser meanings", () => {
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
      {
        text: "Across the country",
        termType: "phrase",
        meanings: [
          {
            chineseMeaning: "Across the country 的中文意思",
            exampleSentence: 'Please use "Across the country" in a simple sentence.',
            fieldSources: { chineseMeaning: "mock_generated", exampleSentence: "mock_generated" },
          },
        ],
      },
    );

    expect(parsed.meanings).toEqual([
      {
        chineseMeaning: "在全国各地；遍及全国",
        exampleSentence: undefined,
        fieldSources: { chineseMeaning: "web_lookup" },
      },
    ]);
  });
});

describe("baiduBrowserTranslateTerm", () => {
  afterEach(() => {
    vi.doUnmock("playwright");
    vi.resetModules();
  });

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

  it("uses rendered page text when Baidu wait condition times out after translation appears", async () => {
    vi.resetModules();
    const pageText = [
      "文本翻译",
      "英语",
      "中文(简体)",
      "—Where are they from? —It says Antarctica.",
      "参考知识",
      "AI翻译",
      "AI大模型翻译",
      "——他们来自哪里？——上面写着南极洲。",
      "编辑译文",
      "段落对照",
      "试一试：",
      "翻译详解",
    ].join("\n");
    const bodyLocator = {
      innerText: vi.fn(async () => pageText),
    };
    const page = {
      setDefaultTimeout: vi.fn(),
      goto: vi.fn(async () => undefined),
      url: vi.fn(() => "https://fanyi.baidu.com/mtpe-individual/transText"),
      title: vi.fn(async () => "百度翻译"),
      waitForFunction: vi.fn(async () => {
        throw new Error("Timeout 30000ms exceeded.");
      }),
      locator: vi.fn(() => bodyLocator),
      close: vi.fn(async () => undefined),
    };
    const context = {
      newPage: vi.fn(async () => page),
      close: vi.fn(async () => undefined),
    };
    const browser = {
      newContext: vi.fn(async () => context),
    };
    vi.doMock("playwright", () => ({
      chromium: {
        launch: vi.fn(async () => browser),
      },
    }));
    const { baiduBrowserTranslateTerm: translateWithBrowser } = await import("@/lib/enrichment/baidu-browser-provider");

    const translated = await translateWithBrowser(
      {
        text: "—Where are they from? —It says Antarctica.",
        termType: "sentence",
        meanings: [
          {
            chineseMeaning: "",
            exampleSentence: "—Where are they from? —It says Antarctica.",
            fieldSources: { exampleSentence: "parsed" },
          },
        ],
      },
      { timeoutMs: 1 },
    );

    expect(page.waitForFunction).toHaveBeenCalledOnce();
    expect(translated.meanings[0]).toMatchObject({
      chineseMeaning: "——他们来自哪里？——上面写着南极洲。",
      exampleSentence: "—Where are they from? —It says Antarctica.",
      fieldSources: { chineseMeaning: "web_lookup", exampleSentence: "parsed" },
    });
  });
});
