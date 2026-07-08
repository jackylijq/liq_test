"use server";

import { redirect } from "next/navigation";
import { enrichTermDraft } from "@/lib/enrichment/provider";
import { parseDocxBuffer } from "@/lib/import/parse-docx";
import { parseImportedText } from "@/lib/import/parse-text";
import { parsePdfBuffer } from "@/lib/import/parse-pdf";
import { prisma } from "@/lib/db";
import type { TermDraft } from "@/lib/types";
import { normalizeTermText } from "@/lib/terms/normalize";

export async function parseImportAction(formData: FormData) {
  const content = String(formData.get("content") ?? "");
  const parsed = await parseImportFormData(formData, content);
  const enriched = await Promise.all(parsed.map(enrichTermDraft));
  const targetGroup = await getDefaultGroup();
  const batch = await prisma.importBatch.create({
    data: {
      sourceType: "paste",
      targetGroupId: targetGroup.id,
      status: "preview",
      rows: {
        create: enriched.map((row, index) => ({
          rowIndex: index,
          rawText: row.text,
          parsedJson: JSON.stringify(parsed[index]),
          enrichedJson: JSON.stringify(row),
          duplicateStatus: "unchecked",
          validationStatus: "valid",
        })),
      },
    },
  });
  redirect(`/teacher/import/${batch.id}/preview`);
}

async function parseImportFormData(formData: FormData, pastedContent: string): Promise<TermDraft[]> {
  const file = formData.get("file");
  if (file instanceof File && file.size > 0) {
    const buffer = Buffer.from(await file.arrayBuffer());
    const fileName = file.name.toLowerCase();

    if (fileName.endsWith(".docx") || file.type.includes("wordprocessingml.document")) {
      return parseDocxBuffer(buffer);
    }

    if (fileName.endsWith(".pdf") || file.type === "application/pdf") {
      return parsePdfBuffer(buffer);
    }

    return parseImportedText(await file.text());
  }

  return parseImportedText(pastedContent);
}

export async function getPreviewRows(batchId: string) {
  const rows = await prisma.importRow.findMany({
    where: { batchId },
    orderBy: { rowIndex: "asc" },
  });
  return rows.map((row) => JSON.parse(row.enrichedJson) as TermDraft);
}

export async function confirmImportAction(formData: FormData) {
  const batchId = String(formData.get("batchId") ?? "");
  const batch = await prisma.importBatch.findUnique({
    where: { id: batchId },
    include: { rows: { orderBy: { rowIndex: "asc" } } },
  });
  if (!batch) {
    redirect("/teacher/library");
  }

  for (const row of batch.rows) {
    const draft = JSON.parse(row.enrichedJson) as TermDraft;
    const term = await prisma.term.upsert({
      where: {
        normalizedText_termType: {
          normalizedText: normalizeTermText(draft.text),
          termType: draft.termType,
        },
      },
      update: {},
      create: {
        text: draft.text,
        normalizedText: normalizeTermText(draft.text),
        termType: draft.termType,
        createdSource: "import",
      },
      include: { meanings: true },
    });

    await prisma.termGroup.upsert({
      where: {
        termId_groupId: {
          termId: term.id,
          groupId: batch.targetGroupId,
        },
      },
      update: {},
      create: {
        termId: term.id,
        groupId: batch.targetGroupId,
      },
    });

    for (const meaning of draft.meanings) {
      const exists = term.meanings.some((saved) => saved.chineseMeaning.trim() === meaning.chineseMeaning.trim());
      if (!exists) {
        await prisma.termMeaning.create({
          data: {
            termId: term.id,
            partOfSpeech: draft.termType === "phrase" ? null : (meaning.partOfSpeech ?? null),
            chineseMeaning: meaning.chineseMeaning,
            exampleSentence: meaning.exampleSentence ?? null,
            explanation: meaning.explanation ?? null,
            usageContext: meaning.usageContext ?? null,
            fieldSourcesJson: JSON.stringify(meaning.fieldSources),
          },
        });
      }
    }
  }

  await prisma.importBatch.update({
    where: { id: batch.id },
    data: { status: "confirmed", confirmedAt: new Date() },
  });
  redirect("/teacher/library");
}

async function getDefaultGroup() {
  const existing = await prisma.group.findFirst({
    orderBy: { sortOrder: "asc" },
  });
  if (existing) return existing;

  return prisma.group.create({
    data: { name: "1年级上册", sortOrder: 1 },
  });
}
