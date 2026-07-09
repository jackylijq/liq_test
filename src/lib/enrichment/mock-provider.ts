import type { TermDraft } from "@/lib/types";

export async function mockEnrichTerm(draft: TermDraft): Promise<TermDraft> {
  if (draft.termType === "sentence") {
    return {
      ...draft,
      phoneticSymbol: undefined,
      meanings: draft.meanings.length
        ? draft.meanings.map((meaning) => ({
            ...meaning,
            partOfSpeech: undefined,
            exampleSentence: meaning.exampleSentence ?? draft.text,
            fieldSources: {
              ...meaning.fieldSources,
              exampleSentence: meaning.fieldSources.exampleSentence ?? "parsed",
            },
          }))
        : [
            {
              chineseMeaning: "",
              exampleSentence: draft.text,
              fieldSources: { exampleSentence: "parsed" },
            },
          ],
    };
  }

  if (draft.termType === "phrase") {
    return {
      ...draft,
      phoneticSymbol: undefined,
      meanings: draft.meanings.length
        ? draft.meanings.map((meaning) => ({
            ...meaning,
            chineseMeaning: meaning.chineseMeaning.trim() || `${draft.text} 的中文意思`,
            exampleSentence: meaning.exampleSentence ?? `Please use "${draft.text}" in a simple sentence.`,
            partOfSpeech: undefined,
            fieldSources: {
              ...meaning.fieldSources,
              chineseMeaning: meaning.chineseMeaning.trim()
                ? meaning.fieldSources.chineseMeaning
                : "mock_generated",
              exampleSentence: meaning.fieldSources.exampleSentence ?? "mock_generated",
            },
          }))
        : [
            {
              chineseMeaning: `${draft.text} 的中文意思`,
              exampleSentence: `Please use "${draft.text}" in a simple sentence.`,
              fieldSources: {
                chineseMeaning: "mock_generated",
                exampleSentence: "mock_generated",
              },
            },
          ],
    };
  }

  return {
    ...draft,
    phoneticSymbol: draft.phoneticSymbol ?? `/${draft.text}/`,
    pronunciationUrl: draft.pronunciationUrl ?? `https://fanyi.baidu.com/gettts?lan=en&text=${encodeURIComponent(draft.text)}&spd=3&source=web`,
    meanings: draft.meanings.length
      ? draft.meanings.map((meaning) => ({
          ...meaning,
          partOfSpeech: meaning.partOfSpeech ?? "noun",
          chineseMeaning: meaning.chineseMeaning.trim() || `${draft.text} 的中文意思`,
          exampleSentence: meaning.exampleSentence ?? `This is an example sentence for ${draft.text}.`,
          explanation: meaning.explanation ?? `${draft.text} is used as a common English word.`,
          fieldSources: {
            ...meaning.fieldSources,
            partOfSpeech: meaning.fieldSources.partOfSpeech ?? "mock_generated",
            chineseMeaning: meaning.chineseMeaning.trim()
              ? meaning.fieldSources.chineseMeaning
              : "mock_generated",
            exampleSentence: meaning.fieldSources.exampleSentence ?? "mock_generated",
            explanation: meaning.fieldSources.explanation ?? "mock_generated",
          },
        }))
      : [
          {
            partOfSpeech: "noun",
            chineseMeaning: `${draft.text} 的中文意思`,
            exampleSentence: `This is an example sentence for ${draft.text}.`,
            explanation: `${draft.text} is used as a common English word.`,
            fieldSources: {
              partOfSpeech: "mock_generated",
              chineseMeaning: "mock_generated",
              exampleSentence: "mock_generated",
              explanation: "mock_generated",
            },
          },
        ],
  };
}
