"use server";

import { redirect } from "next/navigation";
import { enrichTermDraft } from "@/lib/enrichment/provider";
import { prisma } from "@/lib/db";
import type { MeaningDraft, TermDraft, TermType } from "@/lib/types";
import { normalizeTermText } from "@/lib/terms/normalize";
import { getTeacherGroupScope, getTeacherGroupScopeIds, sortTeacherTermsForEnrichment } from "@/lib/teacher/groups";

type DbTerm = Awaited<ReturnType<typeof getTermsForEnrichment>>[number];

export async function enrichTeacherTermsAction(formData: FormData) {
  const targetGroupId = String(formData.get("targetGroupId") ?? "");
  const mode = String(formData.get("mode") ?? "selected");
  const selectedIds = formData.getAll("termId").map(String).filter(Boolean);

  if (!targetGroupId) redirect("/teacher");
  if (mode !== "all" && selectedIds.length === 0) redirect(`/teacher/enrich?groupId=${targetGroupId}&error=empty-selection`);

  const terms = await getTermsForEnrichment(targetGroupId, mode === "all" ? undefined : selectedIds);
  for (const term of terms) {
    const draft = dbTermToDraft(term);
    const enriched = await enrichTermDraft(draft, { useBrowser: true });
    await saveEnrichedTerm(term, enriched);
  }

  const scope = await getTeacherGroupScope(targetGroupId);
  redirect(scope?.teacherHref ?? `/teacher?groupId=${targetGroupId}`);
}

async function getTermsForEnrichment(groupId: string, selectedIds?: string[]) {
  const groupIds = await getTeacherGroupScopeIds(groupId);
  const terms = await prisma.term.findMany({
    where: {
      groups: { some: { groupId: { in: groupIds } } },
      ...(selectedIds ? { id: { in: selectedIds } } : {}),
    },
    include: { meanings: true },
    orderBy: [{ termType: "asc" }, { text: "asc" }],
  });
  return sortTeacherTermsForEnrichment(terms);
}

function parseFieldSourcesJson(json: string): MeaningDraft["fieldSources"] {
  try {
    return JSON.parse(json) as MeaningDraft["fieldSources"];
  } catch {
    return {};
  }
}

function dbTermToDraft(term: DbTerm): TermDraft {
  return {
    text: term.text,
    normalizedText: normalizeTermText(term.text),
    termType: term.termType as TermType,
    phoneticSymbol: term.phoneticSymbol ?? undefined,
    pronunciationUrl: term.pronunciationUrl ?? undefined,
    meanings: term.meanings.map((meaning) => ({
      partOfSpeech: meaning.partOfSpeech ?? undefined,
      chineseMeaning: meaning.chineseMeaning,
      exampleSentence: meaning.exampleSentence ?? undefined,
      explanation: meaning.explanation ?? undefined,
      usageContext: meaning.usageContext ?? undefined,
      fieldSources: parseFieldSourcesJson(meaning.fieldSourcesJson),
    })),
  };
}

async function saveEnrichedTerm(term: DbTerm, draft: TermDraft) {
  await prisma.term.update({
    where: { id: term.id },
    data: {
      phoneticSymbol: term.phoneticSymbol ?? (draft.termType === "word" ? (draft.phoneticSymbol ?? null) : null),
      pronunciationUrl: term.pronunciationUrl ?? (draft.termType === "word" ? (draft.pronunciationUrl ?? null) : null),
    },
  });

  for (const meaning of draft.meanings) {
    if (!hasMeaningContent(meaning)) continue;

    const existing = findExistingMeaning(term.meanings, meaning);
    if (existing) {
      await prisma.termMeaning.update({
        where: { id: existing.id },
        data: {
          chineseMeaning: shouldReplaceChineseMeaning(existing, meaning) ? meaning.chineseMeaning : existing.chineseMeaning,
          exampleSentence: existing.exampleSentence ?? meaning.exampleSentence ?? null,
          explanation: existing.explanation ?? meaning.explanation ?? null,
          usageContext: existing.usageContext ?? meaning.usageContext ?? null,
          fieldSourcesJson: JSON.stringify({
            ...parseFieldSourcesJson(existing.fieldSourcesJson),
            ...meaning.fieldSources,
          }),
        },
      });
      continue;
    }

    await prisma.termMeaning.create({
      data: {
        termId: term.id,
        partOfSpeech: draft.termType === "word" ? (meaning.partOfSpeech ?? null) : null,
        chineseMeaning: meaning.chineseMeaning,
        exampleSentence: meaning.exampleSentence ?? null,
        explanation: meaning.explanation ?? null,
        usageContext: meaning.usageContext ?? null,
        fieldSourcesJson: JSON.stringify(meaning.fieldSources),
      },
    });
  }
}

function findExistingMeaning(existingMeanings: DbTerm["meanings"], meaning: MeaningDraft) {
  return (
    existingMeanings.find((saved) => meaning.partOfSpeech && saved.partOfSpeech === meaning.partOfSpeech) ??
    existingMeanings.find((saved) => saved.chineseMeaning.trim() === meaning.chineseMeaning.trim())
  );
}

function shouldReplaceChineseMeaning(existing: DbTerm["meanings"][number], meaning: MeaningDraft) {
  const existingText = existing.chineseMeaning.trim();
  const incomingText = meaning.chineseMeaning.trim();
  if (!incomingText) return false;
  if (!existingText) return true;

  const existingSources = parseFieldSourcesJson(existing.fieldSourcesJson);
  if (existingSources.chineseMeaning === "mock_generated") return true;
  if (meaning.fieldSources.chineseMeaning !== "web_lookup") return false;
  return incomingText.length > existingText.length;
}

function hasMeaningContent(meaning: MeaningDraft) {
  return Boolean(
    meaning.chineseMeaning.trim() ||
      meaning.exampleSentence?.trim() ||
      meaning.explanation?.trim() ||
      meaning.usageContext?.trim(),
  );
}
