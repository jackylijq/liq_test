import { buildBaiduTtsUrl } from "@/lib/enrichment/baidu-translate-provider";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const text = new URL(request.url).searchParams.get("text")?.trim();
  if (!text) {
    return Response.json({ error: "Missing text" }, { status: 400 });
  }

  const upstream = await fetch(buildBaiduTtsUrl(text), {
    cache: "no-store",
    headers: {
      Accept: "audio/mpeg,audio/*;q=0.9,*/*;q=0.8",
      Referer: "https://fanyi.baidu.com/",
      "User-Agent": "Mozilla/5.0",
    },
  });
  if (!upstream.ok) {
    return Response.json({ error: "TTS upstream failed" }, { status: 502 });
  }
  const contentType = upstream.headers.get("Content-Type") ?? "audio/mpeg";
  if (!contentType.toLowerCase().startsWith("audio/")) {
    return Response.json({ error: "TTS upstream returned non-audio content" }, { status: 502 });
  }

  const audio = await upstream.arrayBuffer();
  return new Response(audio, {
    headers: {
      "Cache-Control": "public, max-age=86400",
      "Content-Type": contentType,
    },
  });
}
