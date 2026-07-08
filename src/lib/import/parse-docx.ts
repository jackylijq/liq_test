import mammoth from "mammoth";
import type { TermDraft } from "@/lib/types";
import { parseImportedText } from "./parse-text";

export async function parseDocxBuffer(buffer: Buffer): Promise<TermDraft[]> {
  const result = await mammoth.extractRawText({ buffer });
  return parseImportedText(result.value);
}
