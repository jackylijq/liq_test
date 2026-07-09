import type { TermDraft, TermType } from "@/lib/types";
import { normalizeTermText } from "@/lib/terms/normalize";

export type TeacherImportMode = "source" | "supplement";

export type ExistingImportTerm = {
  text: string;
  normalizedText: string;
  termType: string;
};

function getSupplementMatchKeys(text: string, termType: string) {
  const normalized = normalizeTermText(text);
  const keys = [normalized];
  if (termType === "sentence") {
    keys.push(normalized.replace(/\s+/g, ""));
  }
  return [...new Set(keys)];
}

function normalizeSupplementMeanings(row: TermDraft, matched: ExistingImportTerm, termType: TermType) {
  const meanings =
    termType === "phrase" || termType === "sentence"
      ? row.meanings.map(({ partOfSpeech: _partOfSpeech, ...meaning }) => meaning)
      : row.meanings;

  if (termType !== "sentence") return meanings;

  return meanings.map((meaning) => ({
    ...meaning,
    exampleSentence: meaning.exampleSentence && normalizeTermText(meaning.exampleSentence) === normalizeTermText(row.text)
      ? matched.text
      : meaning.exampleSentence,
  }));
}

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

export function shouldUseBrowserForSourceImport(row: TermDraft, options: { rowCount?: number } = {}) {
  if (row.termType !== "word") return false;

  if (row.phoneticSymbol) {
    const normalizedPhonetic = row.phoneticSymbol.replace(/^\/|\/$/g, "").trim().toLowerCase();
    if (normalizedPhonetic === row.text.trim().toLowerCase()) return true;
  }

  const hasChineseMeaning = row.meanings.some((meaning) => meaning.chineseMeaning.trim());
  return options.rowCount === 1 && !hasChineseMeaning;
}

export function buildSupplementDrafts(parsedRows: TermDraft[], existingTerms: ExistingImportTerm[]): TermDraft[] {
  const existingByText = new Map<string, ExistingImportTerm[]>();
  for (const term of existingTerms) {
    for (const key of getSupplementMatchKeys(term.normalizedText || term.text, term.termType)) {
      const terms = existingByText.get(key) ?? [];
      terms.push(term);
      existingByText.set(key, terms);
    }
  }

  const matchedRows: TermDraft[] = [];
  const seen = new Set<string>();

  for (const row of parsedRows) {
    const matches = getSupplementMatchKeys(row.text, row.termType)
      .flatMap((key) => existingByText.get(key) ?? []);
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
      meanings: normalizeSupplementMeanings(row, matched, termType),
    });
  }

  return matchedRows;
}
