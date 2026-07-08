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
          content: `Return JSON only for this English ${draft.termType}: ${JSON.stringify(draft)}`,
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
