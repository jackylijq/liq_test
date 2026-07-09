import pdfParse from "pdf-parse";
import type { TermDraft } from "@/lib/types";
import { parseImportedText } from "./parse-text";

export async function extractPdfText(buffer: Buffer): Promise<string> {
  const result = await pdfParse(buffer);
  return result.text;
}

export async function parsePdfBuffer(buffer: Buffer): Promise<TermDraft[]> {
  return parseImportedText(await extractPdfText(buffer));
}
