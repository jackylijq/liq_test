"use server";

import { Prisma } from "@prisma/client";
import { redirect } from "next/navigation";
import { enrichTermDraft } from "@/lib/enrichment/provider";
import { extractDocxText } from "@/lib/import/parse-docx";
import { buildSupplementDrafts, getTeacherImportMode, shouldUseBrowserForSourceImport, type TeacherImportMode } from "@/lib/import/import-mode";
import { parseImportedText } from "@/lib/import/parse-text";
import { extractPdfText } from "@/lib/import/parse-pdf";
import { prisma } from "@/lib/db";
import { logTeacherDebug } from "@/lib/debug/teacher-debug";
import { getTeacherGroupScope, getTeacherGroupScopeIds } from "@/lib/teacher/groups";
import type { MeaningDraft, TermDraft } from "@/lib/types";
import { normalizeTermText } from "@/lib/terms/normalize";
import { choosePhoneticSymbol } from "@/lib/terms/phonetics";

type DbClient = typeof prisma | Prisma.TransactionClient;

const importEnrichConcurrency = Number(process.env.TEACHER_IMPORT_ENRICH_CONCURRENCY ?? 4);
const browserImportBatchLimit = Number(process.env.BAIDU_BROWSER_IMPORT_BATCH_LIMIT ?? 2);

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
    redirect(`/teacher/materials/${targetGroup.id}?error=empty-import`);
  }

  const browserUsagePlan = parsedImport.mode === "source" ? buildBrowserUsagePlan(parsed) : [];
  const enriched =
    parsedImport.mode === "source"
      ? await mapWithConcurrency(parsed, importEnrichConcurrency, async (row, index) => {
          const useBrowser = browserUsagePlan[index] ?? false;
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
        })
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

function buildBrowserUsagePlan(rows: TermDraft[]) {
  let usedBrowserRows = 0;
  const maxBrowserRows = rows.length === 1 ? 1 : Math.max(0, browserImportBatchLimit);

  return rows.map((row) => {
    const requested = shouldUseBrowserForSourceImport(row, { rowCount: rows.length });
    if (!requested || usedBrowserRows >= maxBrowserRows) return false;
    usedBrowserRows += 1;
    return true;
  });
}

async function mapWithConcurrency<T, R>(items: T[], concurrency: number, mapper: (item: T, index: number) => Promise<R>) {
  const limit = Math.max(1, concurrency);
  const results = new Array<R>(items.length);
  let nextIndex = 0;

  async function worker() {
    while (nextIndex < items.length) {
      const currentIndex = nextIndex;
      nextIndex += 1;
      results[currentIndex] = await mapper(items[currentIndex], currentIndex);
    }
  }

  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, () => worker()));
  return results;
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
      const rootGroupId = (await getTeacherGroupScope(targetGroupId))?.rootGroupId ?? targetGroupId;
      const scopeGroupIds = await getTeacherGroupScopeIds(rootGroupId);
      const parsedRows = parseImportedText(extractedText);
      const existingTerms = await prisma.term.findMany({
        where: { groups: { some: { groupId: { in: scopeGroupIds } } } },
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

  const startedAt = Date.now();
  logTeacherDebug("import", "confirm:start", {
    batchId: batch.id,
    sourceType: batch.sourceType,
    rowCount: batch.rows.length,
  });

  await prisma.$transaction(async (tx) => {
    const rootGroupId = await getRootGroupId(tx, batch.targetGroupId);
    const rootScopeIds = await getGroupScopeIds(tx, rootGroupId);

    for (const row of batch.rows) {
      const draft = JSON.parse(row.enrichedJson) as TermDraft;
      logTeacherDebug("import", "confirm:row", {
        batchId: batch.id,
        sourceType: batch.sourceType,
        text: draft.text,
        termType: draft.termType,
        meaningCount: draft.meanings.length,
        categoryPath: draft.categoryPath,
      });
      if (batch.sourceType === "supplement") {
        await applySupplementDraft(tx, draft);
        continue;
      }

      const { term, matchedInCurrentRoot } = await findOrCreateSourceTerm(tx, draft, rootScopeIds);

      for (const groupId of [rootGroupId]) {
        await tx.termGroup.upsert({
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

      await saveDraftMeanings(tx, term.id, draft, term.meanings);
      logTeacherDebug("import", "confirm:saved-term", {
        id: term.id,
        text: term.text,
        matchedInCurrentRoot,
        meaningCount: draft.meanings.filter(hasMeaningContent).length,
      });
    }

    await tx.importBatch.update({
      where: { id: batch.id },
      data: { status: "confirmed", confirmedAt: new Date() },
    });
  });

  logTeacherDebug("import", "confirm:done", {
    batchId: batch.id,
    rowCount: batch.rows.length,
    durationMs: Date.now() - startedAt,
  });
  redirect(`/teacher/materials/${batch.targetGroupId}?importBatchId=${batch.id}`);
}

async function getRootGroupId(client: DbClient, groupId: string) {
  const group = await client.group.findUnique({
    where: { id: groupId },
    include: {
      parent: {
        include: {
          parent: true,
        },
      },
    },
  });
  return group?.parent?.parent?.id ?? group?.parent?.id ?? group?.id ?? groupId;
}

async function getGroupScopeIds(client: DbClient, groupId: string) {
  const groupIds = [groupId];
  let frontier = [groupId];

  while (frontier.length > 0) {
    const children = await client.group.findMany({
      where: { parentId: { in: frontier } },
      select: { id: true },
    });
    frontier = children.map((child) => child.id);
    groupIds.push(...frontier);
  }

  return groupIds;
}

async function findOrCreateSourceTerm(client: DbClient, draft: TermDraft, scopeGroupIds: string[]) {
  const normalizedText = normalizeTermText(draft.text);
  const scopedTerm = await client.term.findFirst({
    where: {
      normalizedText,
      termType: draft.termType,
      groups: { some: { groupId: { in: scopeGroupIds } } },
    },
    include: { meanings: true },
  });
  if (scopedTerm) return { term: scopedTerm, matchedInCurrentRoot: true };

  try {
    const term = await client.term.create({
      data: {
        text: draft.text,
        normalizedText,
        termType: draft.termType,
        phoneticSymbol: draft.termType === "word" ? (draft.phoneticSymbol ?? null) : null,
        pronunciationUrl: draft.termType === "word" ? (draft.pronunciationUrl ?? null) : null,
        createdSource: "import",
      },
      include: { meanings: true },
    });
    return { term, matchedInCurrentRoot: false };
  } catch (error) {
    if (!(error instanceof Prisma.PrismaClientKnownRequestError) || error.code !== "P2002") {
      throw error;
    }
    const term = await client.term.findUnique({
      where: {
        normalizedText_termType: {
          normalizedText,
          termType: draft.termType,
        },
      },
      include: { meanings: true },
    });
    if (!term) throw error;
    return { term, matchedInCurrentRoot: false };
  }
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

async function applySupplementDraft(client: DbClient, draft: TermDraft) {
  const term = await client.term.findUnique({
    where: {
      normalizedText_termType: {
        normalizedText: normalizeTermText(draft.text),
        termType: draft.termType,
      },
    },
    include: { meanings: true },
  });
  if (!term) return;

  await client.term.update({
    where: { id: term.id },
    data: {
      phoneticSymbol: draft.termType === "word" ? choosePhoneticSymbol(draft.text, term.phoneticSymbol, draft.phoneticSymbol) : null,
      pronunciationUrl: term.pronunciationUrl ?? (draft.termType === "word" ? (draft.pronunciationUrl ?? null) : null),
    },
  });
  await saveDraftMeanings(client, term.id, draft, term.meanings);
}

async function saveDraftMeanings(
  client: DbClient,
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
      await client.termMeaning.update({
        where: { id: existing.id },
        data: {
          exampleSentence: existing.exampleSentence ?? meaning.exampleSentence ?? null,
          explanation: existing.explanation ?? meaning.explanation ?? null,
          usageContext: existing.usageContext ?? meaning.usageContext ?? null,
        },
      });
      continue;
    }

    await client.termMeaning.create({
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
