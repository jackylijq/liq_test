import { afterEach, describe, expect, it, vi } from "vitest";
import { buildBaiduTtsUrl } from "@/lib/enrichment/baidu-translate-provider";
import { buildPronunciationAudioUrl } from "@/lib/terms/pronunciation";

describe("buildPronunciationAudioUrl", () => {
  it("uses the local TTS proxy with encoded word text", () => {
    expect(buildPronunciationAudioUrl("take care")).toBe("/api/tts?text=take%20care");
  });
});

describe("GET /api/tts", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("proxies Baidu TTS audio through the app", async () => {
    const audioBytes = new Uint8Array([1, 2, 3]);
    const fetchMock = vi.fn(async () => new Response(audioBytes, { headers: { "Content-Type": "audio/mpeg" } }));
    vi.stubGlobal("fetch", fetchMock);
    const { GET } = await import("@/app/api/tts/route");

    const response = await GET(new Request("http://localhost/api/tts?text=care"));

    expect(fetchMock).toHaveBeenCalledWith(buildBaiduTtsUrl("care"), {
      cache: "no-store",
      headers: {
        Accept: "audio/mpeg,audio/*;q=0.9,*/*;q=0.8",
        Referer: "https://fanyi.baidu.com/",
        "User-Agent": "Mozilla/5.0",
      },
    });
    expect(response.status).toBe(200);
    expect(response.headers.get("Content-Type")).toBe("audio/mpeg");
    expect(new Uint8Array(await response.arrayBuffer())).toEqual(audioBytes);
  });

  it("rejects missing text", async () => {
    const { GET } = await import("@/app/api/tts/route");

    const response = await GET(new Request("http://localhost/api/tts"));

    expect(response.status).toBe(400);
  });

  it("rejects non-audio upstream responses", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response("<html></html>", { headers: { "Content-Type": "text/html" } })));
    const { GET } = await import("@/app/api/tts/route");

    const response = await GET(new Request("http://localhost/api/tts?text=care"));

    expect(response.status).toBe(502);
  });
});
