import mammoth from "mammoth";
import type { TermDraft } from "@/lib/types";
import { parseImportedText } from "./parse-text";

export async function extractDocxText(buffer: Buffer): Promise<string> {
  const result = await mammoth.extractRawText({ buffer });
  return result.value;
}

export async function parseDocxBuffer(buffer: Buffer): Promise<TermDraft[]> {
  return parseImportedText(await extractDocxText(buffer));
}
