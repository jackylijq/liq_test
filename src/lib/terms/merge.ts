import type { MeaningDraft, TermDraft } from "@/lib/types";
import { normalizeTermText, sameMeaning } from "./normalize";

function cleanPhraseMeaning(meaning: MeaningDraft): MeaningDraft {
  const { partOfSpeech: _partOfSpeech, ...rest } = meaning;
  return rest;
}

export function mergeTermDraft(existing: TermDraft | undefined, incoming: TermDraft): TermDraft {
  const normalizedText = normalizeTermText(incoming.text);
  const cleanedIncoming: TermDraft = {
    ...incoming,
    normalizedText,
    phoneticSymbol: incoming.termType === "phrase" ? undefined : incoming.phoneticSymbol,
    meanings: incoming.termType === "phrase" ? incoming.meanings.map(cleanPhraseMeaning) : incoming.meanings,
  };

  if (!existing) {
    return cleanedIncoming;
  }

  const merged: TermDraft = {
    ...existing,
    normalizedText: existing.normalizedText ?? normalizedText,
    phoneticSymbol: existing.termType === "phrase" ? undefined : (existing.phoneticSymbol ?? cleanedIncoming.phoneticSymbol),
    meanings: [...existing.meanings],
  };

  for (const incomingMeaning of cleanedIncoming.meanings) {
    const duplicate = merged.meanings.find((meaning) =>
      sameMeaning(meaning.chineseMeaning, incomingMeaning.chineseMeaning),
    );
    if (!duplicate) {
      merged.meanings.push(incomingMeaning);
    }
  }

  return merged;
}
