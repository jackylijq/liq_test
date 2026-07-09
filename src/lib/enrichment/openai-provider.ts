import type { TermDraft } from "@/lib/types";

export async function openAiEnrichTerm(draft: TermDraft): Promise<TermDraft> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error("OPENAI_API_KEY is not configured");
  }

  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: process.env.OPENAI_MODEL ?? "gpt-4.1-mini",
      input: [
        {
          role: "user",
          content: buildEnrichmentPrompt(draft),
        },
      ],
    }),
  });

  if (!response.ok) {
    throw new Error(`AI enrichment failed with status ${response.status}`);
  }

  const json = await response.json();
  const text = json.output_text;
  if (typeof text !== "string") {
    throw new Error("AI enrichment returned no output_text");
  }

  return JSON.parse(text) as TermDraft;
}

export function buildEnrichmentPrompt(draft: TermDraft) {
  const baseRules = [
    "Return JSON only. Do not wrap the result in markdown.",
    "Keep the same TermDraft shape as the input.",
    "Use fieldSources values: parsed, api_generated, or user_provided.",
    "Preserve existing parsed or user_provided fields unless they are empty.",
    "For generated fields, set the matching fieldSources value to api_generated.",
  ];

  const typeRules: Record<TermDraft["termType"], string[]> = {
    word: [
      "这是一个英语单词。",
      "补齐 phoneticSymbol、partOfSpeech、chineseMeaning、exampleSentence、explanation。",
      "partOfSpeech 使用完整英文词性，例如 noun, verb, adjective, adverb, preposition。",
      "如果一个单词有多个常用词性或中文意思，可以在 meanings 中返回多条。",
    ],
    phrase: [
      "这是一个英语短语或固定搭配。",
      "不要返回 phoneticSymbol。",
      "不要返回 partOfSpeech。",
      "补齐 chineseMeaning 和 exampleSentence。",
      "常用场景只在有可靠、具体使用场景时返回 usageContext；没有可靠场景时不要返回 usageContext。",
    ],
    sentence: [
      "这是一个英语句型。",
      "不要返回 phoneticSymbol。",
      "不要返回 partOfSpeech。",
      "在 meanings[0].chineseMeaning 中返回自然、准确的中文翻译。",
      "exampleSentence 可以保留为原句；如果原句已经在 text 中，不要另造不相关例句。",
      "不要返回 usageContext，除非输入中已经有明确场景。",
    ],
  };

  return [...baseRules, ...typeRules[draft.termType], `Input TermDraft: ${JSON.stringify(draft)}`].join("\n");
}
