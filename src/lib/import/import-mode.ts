import type { TermDraft, TermType } from "@/lib/types";
import { normalizeTermText } from "@/lib/terms/normalize";

export type TeacherImportMode = "source" | "supplement";

export type ExistingImportTerm = {
  text: string;
  normalizedText: string;
  termType: string;
};

export function getTeacherImportMode(fileName: string | null | undefined, mimeType: string | null | undefined): TeacherImportMode {
  const lowerName = (fileName ?? "").toLowerCase();
  const lowerType = (mimeType ?? "").toLowerCase();

  if (
    lowerName.endsWith(".pdf") ||
    lowerType === "application/pdf" ||
    lowerName.endsWith(".docx") ||
    lowerType.includes("wordprocessingml.document")
  ) {
    return "supplement";
  }

  return "source";
}

export function buildSupplementDrafts(parsedRows: TermDraft[], existingTerms: ExistingImportTerm[]): TermDraft[] {
  const existingByText = new Map<string, ExistingImportTerm[]>();
  for (const term of existingTerms) {
    const key = normalizeTermText(term.normalizedText || term.text);
    const terms = existingByText.get(key) ?? [];
    terms.push(term);
    existingByText.set(key, terms);
  }

  const matchedRows: TermDraft[] = [];
  const seen = new Set<string>();

  for (const row of parsedRows) {
    const matches = existingByText.get(normalizeTermText(row.text));
    if (!matches?.length) continue;

    const matched = matches.find((term) => term.termType === row.termType) ?? (matches.length === 1 ? matches[0] : undefined);
    if (!matched) continue;

    const termType = matched.termType as TermType;
    const key = `${termType}:${normalizeTermText(matched.text)}`;
    if (seen.has(key)) continue;
    seen.add(key);

    matchedRows.push({
      ...row,
      text: matched.text,
      normalizedText: normalizeTermText(matched.text),
      termType,
      phoneticSymbol: termType === "word" ? row.phoneticSymbol : undefined,
      meanings:
        termType === "phrase" || termType === "sentence"
          ? row.meanings.map(({ partOfSpeech: _partOfSpeech, ...meaning }) => meaning)
          : row.meanings,
    });
  }

  return matchedRows;
}
