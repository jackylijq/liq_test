"use server";

import { redirect } from "next/navigation";
import { enrichTermDraft } from "@/lib/enrichment/provider";
import { extractDocxText } from "@/lib/import/parse-docx";
import { buildSupplementDrafts, getTeacherImportMode, shouldUseBrowserForSourceImport, type TeacherImportMode } from "@/lib/import/import-mode";
import { parseImportedText } from "@/lib/import/parse-text";
import { extractPdfText } from "@/lib/import/parse-pdf";
import { prisma } from "@/lib/db";
import { logTeacherDebug } from "@/lib/debug/teacher-debug";
import type { MeaningDraft, TermDraft } from "@/lib/types";
import { normalizeTermText } from "@/lib/terms/normalize";

export async function parseImportAction(formData: FormData) {
  const content = String(formData.get("content") ?? "");
  const targetGroupId = String(formData.get("targetGroupId") ?? "");
  const targetGroup = await resolveTargetGroup(targetGroupId);
  logTeacherDebug("import", "parse:start", {
    targetGroupId: targetGroup.id,
    pastedContent: content,
    pastedContentLength: content.length,
    file: getImportFileDebug(formData),
  });
  const parsedImport = await parseImportFormData(formData, content, targetGroup.id);
  const parsed = parsedImport.rows;
  logTeacherDebug("import", "parse:rows", {
    mode: parsedImport.mode,
    rowCount: parsed.length,
    rows: parsed.map(debugTermDraft),
  });

  if (parsed.length === 0) {
    redirect(`/teacher?groupId=${targetGroup.id}&error=empty-import`);
  }

  const enriched =
    parsedImport.mode === "source"
      ? await Promise.all(
          parsed.map(async (row) => {
            const useBrowser = shouldUseBrowserForSourceImport(row, { rowCount: parsed.length });
            logTeacherDebug("import", "enrich:before", {
              useBrowser,
              row: debugTermDraft(row),
            });
            const enrichedRow = await enrichTermDraft(row, { useBrowser });
            logTeacherDebug("import", "enrich:after", {
              useBrowser,
              row: debugTermDraft(enrichedRow),
            });
            return enrichedRow;
          }),
        )
      : parsed;
  const batch = await prisma.importBatch.create({
    data: {
      sourceType: parsedImport.mode,
      fileName: getImportFileName(formData),
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
  logTeacherDebug("import", "parse:preview-created", {
    batchId: batch.id,
    mode: parsedImport.mode,
    enrichedRows: enriched.map(debugTermDraft),
  });
  redirect(`/teacher/import/${batch.id}/preview`);
}

function getImportFileName(formData: FormData) {
  const file = formData.get("file");
  return file instanceof File && file.size > 0 ? file.name : null;
}

function getImportFileDebug(formData: FormData) {
  const file = formData.get("file");
  if (!(file instanceof File)) return null;
  return {
    name: file.name,
    size: file.size,
    type: file.type,
  };
}

async function resolveTargetGroup(groupId: string) {
  if (groupId) {
    const selected = await prisma.group.findUnique({ where: { id: groupId } });
    if (selected) return selected;
  }

  const existing = await prisma.group.findFirst({
    orderBy: { sortOrder: "asc" },
  });
  if (existing) return existing;

  return prisma.group.create({
    data: { name: "1年级上册", sortOrder: 1 },
  });
}

async function parseImportFormData(
  formData: FormData,
  pastedContent: string,
  targetGroupId: string,
): Promise<{ mode: TeacherImportMode; rows: TermDraft[] }> {
  const file = formData.get("file");
  if (file instanceof File && file.size > 0) {
    const buffer = Buffer.from(await file.arrayBuffer());
    const fileName = file.name.toLowerCase();
    const mode = getTeacherImportMode(fileName, file.type);

    if (mode === "supplement") {
      const extractedText =
        fileName.endsWith(".docx") || file.type.includes("wordprocessingml.document")
          ? await extractDocxText(buffer)
          : await extractPdfText(buffer);
      const parsedRows = parseImportedText(extractedText);
      const existingTerms = await prisma.term.findMany({
        where: { groups: { some: { groupId: targetGroupId } } },
        select: { text: true, normalizedText: true, termType: true },
      });

      return { mode, rows: buildSupplementDrafts(parsedRows, existingTerms) };
    }

    return { mode, rows: parseImportedText(await file.text()) };
  }

  return { mode: "source", rows: parseImportedText(pastedContent) };
}

export async function getPreviewRows(batchId: string) {
  const rows = await prisma.importRow.findMany({
    where: { batchId },
    orderBy: { rowIndex: "asc" },
  });
  return rows.map((row) => JSON.parse(row.enrichedJson) as TermDraft);
}

export async function getImportBatch(batchId: string) {
  const batch = await prisma.importBatch.findUnique({ where: { id: batchId } });
  if (!batch) return null;

  const group = await prisma.group.findUnique({ where: { id: batch.targetGroupId } });
  return group ? { ...batch, group } : null;
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
    logTeacherDebug("import", "confirm:row", {
      batchId: batch.id,
      sourceType: batch.sourceType,
      draft: debugTermDraft(draft),
    });
    if (batch.sourceType === "supplement") {
      await applySupplementDraft(draft);
      continue;
    }

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
        phoneticSymbol: draft.termType === "word" ? (draft.phoneticSymbol ?? null) : null,
        pronunciationUrl: draft.termType === "word" ? (draft.pronunciationUrl ?? null) : null,
        createdSource: "import",
      },
      include: { meanings: true },
    });

    for (const groupId of await resolveDraftGroupIds(batch.targetGroupId, draft)) {
      await prisma.termGroup.upsert({
        where: {
          termId_groupId: {
            termId: term.id,
            groupId,
          },
        },
        update: {},
        create: {
          termId: term.id,
          groupId,
        },
      });
    }

    await saveDraftMeanings(term.id, draft, term.meanings);
    const savedTerm = await prisma.term.findUnique({
      where: { id: term.id },
      include: { meanings: { orderBy: [{ partOfSpeech: "asc" }, { createdAt: "asc" }] } },
    });
    logTeacherDebug("import", "confirm:saved-term", {
      term: savedTerm
        ? {
            id: savedTerm.id,
            text: savedTerm.text,
            phoneticSymbol: savedTerm.phoneticSymbol,
            pronunciationUrl: savedTerm.pronunciationUrl,
            meanings: savedTerm.meanings.map((meaning) => ({
              partOfSpeech: meaning.partOfSpeech,
              chineseMeaning: meaning.chineseMeaning,
              exampleSentence: meaning.exampleSentence,
              explanation: meaning.explanation,
              usageContext: meaning.usageContext,
              fieldSourcesJson: meaning.fieldSourcesJson,
            })),
          }
        : null,
    });
  }

  await prisma.importBatch.update({
    where: { id: batch.id },
    data: { status: "confirmed", confirmedAt: new Date() },
  });
  redirect(`/teacher?groupId=${batch.targetGroupId}`);
}

function debugTermDraft(row: TermDraft) {
  return {
    text: row.text,
    termType: row.termType,
    phoneticSymbol: row.phoneticSymbol,
    pronunciationUrl: row.pronunciationUrl,
    categoryPath: row.categoryPath,
    meanings: row.meanings.map((meaning) => ({
      partOfSpeech: meaning.partOfSpeech,
      chineseMeaning: meaning.chineseMeaning,
      exampleSentence: meaning.exampleSentence,
      explanation: meaning.explanation,
      usageContext: meaning.usageContext,
      fieldSources: meaning.fieldSources,
    })),
  };
}

async function applySupplementDraft(draft: TermDraft) {
  const term = await prisma.term.findUnique({
    where: {
      normalizedText_termType: {
        normalizedText: normalizeTermText(draft.text),
        termType: draft.termType,
      },
    },
    include: { meanings: true },
  });
  if (!term) return;

  await prisma.term.update({
    where: { id: term.id },
    data: {
      phoneticSymbol: term.phoneticSymbol ?? (draft.termType === "word" ? (draft.phoneticSymbol ?? null) : null),
      pronunciationUrl: term.pronunciationUrl ?? (draft.termType === "word" ? (draft.pronunciationUrl ?? null) : null),
    },
  });
  await saveDraftMeanings(term.id, draft, term.meanings);
}

async function saveDraftMeanings(
  termId: string,
  draft: TermDraft,
  existingMeanings: {
    id: string;
    chineseMeaning: string;
    exampleSentence: string | null;
    explanation: string | null;
    usageContext: string | null;
  }[],
) {
  for (const meaning of draft.meanings) {
    if (!hasMeaningContent(meaning)) continue;

    const existing = existingMeanings.find((saved) => saved.chineseMeaning.trim() === meaning.chineseMeaning.trim());
    if (existing) {
      await prisma.termMeaning.update({
        where: { id: existing.id },
        data: {
          exampleSentence: existing.exampleSentence ?? meaning.exampleSentence ?? null,
          explanation: existing.explanation ?? meaning.explanation ?? null,
          usageContext: existing.usageContext ?? meaning.usageContext ?? null,
        },
      });
      continue;
    }

    await prisma.termMeaning.create({
      data: {
        termId,
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

function hasMeaningContent(meaning: MeaningDraft) {
  return Boolean(
    meaning.chineseMeaning.trim() ||
      meaning.exampleSentence?.trim() ||
      meaning.explanation?.trim() ||
      meaning.usageContext?.trim(),
  );
}

async function resolveDraftGroupIds(targetGroupId: string, draft: TermDraft) {
  const groupIds = [targetGroupId];
  let parentId = targetGroupId;

  for (const [index, rawName] of (draft.categoryPath ?? []).entries()) {
    const name = rawName.trim();
    if (!name) continue;

    const group = await findOrCreateChildGroup(name, parentId, index + 1);
    groupIds.push(group.id);
    parentId = group.id;
  }

  return [...new Set(groupIds)];
}

async function findOrCreateChildGroup(name: string, parentId: string, sortOrder: number) {
  const existing = await prisma.group.findFirst({ where: { name, parentId } });
  if (existing) return existing;

  try {
    return await prisma.group.create({
      data: {
        name,
        parentId,
        sortOrder,
      },
    });
  } catch (error) {
    const concurrent = await prisma.group.findFirst({ where: { name, parentId } });
    if (concurrent) return concurrent;
    throw error;
  }
}
