import pdfParse from "pdf-parse";
import type { TermDraft } from "@/lib/types";
import { parseImportedText } from "./parse-text";

export async function parsePdfBuffer(buffer: Buffer): Promise<TermDraft[]> {
  const result = await pdfParse(buffer);
  return parseImportedText(result.text);
}
