"use server";

import { redirect } from "next/navigation";
import { enrichTermDraft } from "@/lib/enrichment/provider";
import { parseImportedText } from "@/lib/import/parse-text";

const globalPreviewStore = globalThis as typeof globalThis & {
  importPreviewStore?: Map<string, unknown>;
};

const previewStore = globalPreviewStore.importPreviewStore ?? new Map<string, unknown>();
globalPreviewStore.importPreviewStore = previewStore;

export async function parsePasteAction(formData: FormData) {
  const content = String(formData.get("content") ?? "");
  const parsed = parseImportedText(content);
  const enriched = await Promise.all(parsed.map(enrichTermDraft));
  const batchId = crypto.randomUUID();
  previewStore.set(batchId, enriched);
  redirect(`/teacher/import/${batchId}/preview`);
}

export async function getPreviewRows(batchId: string) {
  return previewStore.get(batchId) ?? [];
}
