"use server";

import { redirect } from "next/navigation";
import { enrichTermDraft } from "@/lib/enrichment/provider";
import { prisma } from "@/lib/db";
import type { MeaningDraft, TermDraft, TermType } from "@/lib/types";
import { normalizeTermText } from "@/lib/terms/normalize";
import { getTeacherGroupScope, getTeacherGroupScopeIds, sortTeacherTermsForEnrichment } from "@/lib/teacher/groups";
import { logTeacherDebug } from "@/lib/debug/teacher-debug";

type DbTerm = Awaited<ReturnType<typeof getTermsForEnrichment>>[number];

export async function enrichTeacherTermsAction(formData: FormData) {
  const targetGroupId = String(formData.get("targetGroupId") ?? "");
  const mode = String(formData.get("mode") ?? "selected");
  const selectedIds = formData.getAll("termId").map(String).filter(Boolean);
  logTeacherDebug("enrich", "action:start", {
    targetGroupId,
    mode,
    selectedIds,
  });

  if (!targetGroupId) redirect("/teacher");
  if (mode !== "all" && selectedIds.length === 0) redirect(`/teacher/enrich?groupId=${targetGroupId}&error=empty-selection`);

  const terms = await getTermsForEnrichment(targetGroupId, mode === "all" ? undefined : selectedIds);
  logTeacherDebug("enrich", "action:terms", {
    count: terms.length,
    terms: terms.map(debugDbTerm),
  });
  for (const term of terms) {
    const draft = dbTermToDraft(term);
    logTeacherDebug("enrich", "term:before", {
      term: debugDbTerm(term),
      draft: debugTermDraft(draft),
    });
    const enriched = await enrichTermDraft(draft, { useBrowser: true });
    logTeacherDebug("enrich", "term:after-enrich", {
      termId: term.id,
      enriched: debugTermDraft(enriched),
    });
    await saveEnrichedTerm(term, enriched);
    const savedTerm = await prisma.term.findUnique({
      where: { id: term.id },
      include: { meanings: { orderBy: [{ partOfSpeech: "asc" }, { createdAt: "asc" }] } },
    });
    logTeacherDebug("enrich", "term:after-save", {
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

  const scope = await getTeacherGroupScope(targetGroupId);
  redirect(scope?.teacherHref ?? `/teacher?groupId=${targetGroupId}`);
}

function debugDbTerm(term: DbTerm) {
  return {
    id: term.id,
    text: term.text,
    termType: term.termType,
    phoneticSymbol: term.phoneticSymbol,
    pronunciationUrl: term.pronunciationUrl,
    meanings: term.meanings.map((meaning) => ({
      id: meaning.id,
      partOfSpeech: meaning.partOfSpeech,
      chineseMeaning: meaning.chineseMeaning,
      exampleSentence: meaning.exampleSentence,
      explanation: meaning.explanation,
      usageContext: meaning.usageContext,
      fieldSourcesJson: meaning.fieldSourcesJson,
    })),
  };
}

function debugTermDraft(row: TermDraft) {
  return {
    text: row.text,
    termType: row.termType,
    phoneticSymbol: row.phoneticSymbol,
    pronunciationUrl: row.pronunciationUrl,
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
      phoneticSymbol: draft.termType === "word" ? choosePhoneticSymbol(term.text, term.phoneticSymbol, draft.phoneticSymbol) : null,
      pronunciationUrl: term.pronunciationUrl ?? (draft.termType === "word" ? (draft.pronunciationUrl ?? null) : null),
    },
  });

  const savedMeaningIds: string[] = [];

  for (const meaning of draft.meanings) {
    if (!hasMeaningContent(meaning)) continue;

    const existing = findExistingMeaning(term, meaning, savedMeaningIds);
    if (existing) {
      const exampleSentence = shouldReplaceNullableField(existing, meaning, "exampleSentence");
      const explanation = shouldReplaceNullableField(existing, meaning, "explanation");
      const usageContext = shouldReplaceNullableField(existing, meaning, "usageContext");
      await prisma.termMeaning.update({
        where: { id: existing.id },
        data: {
          partOfSpeech: draft.termType === "word" ? (meaning.partOfSpeech ?? existing.partOfSpeech) : null,
          chineseMeaning: shouldReplaceChineseMeaning(term.text, existing, meaning) ? meaning.chineseMeaning : existing.chineseMeaning,
          exampleSentence,
          explanation,
          usageContext,
          fieldSourcesJson: JSON.stringify(mergeMeaningFieldSources(existing, meaning, { exampleSentence, explanation, usageContext })),
        },
      });
      savedMeaningIds.push(existing.id);
      continue;
    }

    const created = await prisma.termMeaning.create({
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
    savedMeaningIds.push(created.id);
  }

  await deleteStaleLookupMeanings(term, draft, savedMeaningIds);
}

function choosePhoneticSymbol(termText: string, existing: string | null, incoming: string | undefined) {
  if (!existing) return incoming ?? null;
  if (incoming && isPlaceholderPhonetic(termText, existing)) return incoming;
  return existing;
}

function isPlaceholderPhonetic(termText: string, phoneticSymbol: string) {
  const normalizedPhonetic = phoneticSymbol.replace(/^\/|\/$/g, "").trim().toLowerCase();
  return normalizedPhonetic === termText.trim().toLowerCase();
}

function findExistingMeaning(term: DbTerm, meaning: MeaningDraft, excludedIds: string[]) {
  const availableMeanings = term.meanings.filter((saved) => !excludedIds.includes(saved.id));
  return (
    availableMeanings.find((saved) => meaning.partOfSpeech && saved.partOfSpeech === meaning.partOfSpeech) ??
    availableMeanings.find((saved) => saved.chineseMeaning.trim() === meaning.chineseMeaning.trim()) ??
    availableMeanings.find((saved) => meaning.fieldSources.chineseMeaning === "web_lookup" && shouldReplaceChineseMeaning(term.text, saved, meaning))
  );
}

function shouldReplaceChineseMeaning(termText: string, existing: DbTerm["meanings"][number], meaning: MeaningDraft) {
  const existingText = existing.chineseMeaning.trim();
  const incomingText = meaning.chineseMeaning.trim();
  if (!incomingText) return false;
  if (!existingText) return true;

  const existingSources = parseFieldSourcesJson(existing.fieldSourcesJson);
  if (existingSources.chineseMeaning === "mock_generated") return true;
  if (existingText === `${termText.trim()} 的中文意思`) return true;
  if (meaning.fieldSources.chineseMeaning !== "web_lookup") return false;
  return incomingText.length > existingText.length;
}

function shouldReplaceNullableField(existing: DbTerm["meanings"][number], meaning: MeaningDraft, fieldName: "exampleSentence" | "explanation" | "usageContext") {
  const existingSources = parseFieldSourcesJson(existing.fieldSourcesJson) as Record<string, string | undefined>;
  const incoming = meaning[fieldName]?.trim() || null;
  if (existingSources[fieldName] === "mock_generated") return incoming;
  return existing[fieldName] ?? incoming;
}

function mergeMeaningFieldSources(
  existing: DbTerm["meanings"][number],
  meaning: MeaningDraft,
  nextFields: Record<"exampleSentence" | "explanation" | "usageContext", string | null>,
) {
  const fieldSources = {
    ...parseFieldSourcesJson(existing.fieldSourcesJson),
    ...meaning.fieldSources,
  };

  for (const fieldName of ["exampleSentence", "explanation", "usageContext"] as const) {
    if (!nextFields[fieldName] && fieldSources[fieldName] === "mock_generated") {
      delete fieldSources[fieldName];
    }
  }

  return fieldSources;
}

async function deleteStaleLookupMeanings(term: DbTerm, draft: TermDraft, savedMeaningIds: string[]) {
  const incomingWebMeanings = draft.meanings.filter((meaning) => meaning.fieldSources.chineseMeaning === "web_lookup" && meaning.chineseMeaning.trim());
  if (!incomingWebMeanings.length) return;

  const incomingParts = new Set(incomingWebMeanings.map((meaning) => meaning.partOfSpeech).filter(Boolean));
  const staleIds = term.meanings
    .filter((meaning) => !savedMeaningIds.includes(meaning.id))
    .filter((meaning) => {
      const sources = parseFieldSourcesJson(meaning.fieldSourcesJson);
      if (sources.chineseMeaning === "mock_generated") return true;
      if (meaning.chineseMeaning.trim() === `${term.text.trim()} 的中文意思`) return true;
      if (sources.chineseMeaning === "web_lookup" && (draft.termType !== "word" || incomingParts.size === 0)) return true;
      if (sources.chineseMeaning === "web_lookup" && incomingParts.size > 0 && (!meaning.partOfSpeech || !incomingParts.has(meaning.partOfSpeech))) {
        return true;
      }
      return false;
    })
    .map((meaning) => meaning.id);

  if (staleIds.length) {
    await prisma.termMeaning.deleteMany({ where: { id: { in: staleIds } } });
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
