"use server";

import { Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { normalizeTermText } from "@/lib/terms/normalize";
import { normalizeEditableTermType } from "@/lib/teacher/term-edit";

type DbClient = typeof prisma | Prisma.TransactionClient;

export async function updateTeacherTermAction(formData: FormData) {
  const termId = String(formData.get("termId") ?? "").trim();
  const rootGroupId = String(formData.get("rootGroupId") ?? "").trim();
  const selectedGroupId = String(formData.get("selectedGroupId") ?? "").trim();
  const returnHref = normalizeTeacherReturnHref(String(formData.get("returnHref") ?? ""));
  const text = String(formData.get("text") ?? "").trim();
  const termType = normalizeEditableTermType(String(formData.get("termType") ?? ""));
  const phoneticSymbol = String(formData.get("phoneticSymbol") ?? "").trim();
  const pronunciationUrl = String(formData.get("pronunciationUrl") ?? "").trim();

  if (!termId || !text) redirect(`${returnHref}&error=invalid-term-edit`);

  await prisma.$transaction(async (tx) => {
    await tx.term.update({
      where: { id: termId },
      data: {
        text,
        normalizedText: normalizeTermText(text),
        termType,
        phoneticSymbol: termType === "word" ? phoneticSymbol || null : null,
        pronunciationUrl: termType === "word" ? pronunciationUrl || null : null,
      },
    });

    await saveEditedMeanings(tx, termId, termType, formData);
    await saveEditedCategory(tx, termId, rootGroupId, selectedGroupId);
  });

  revalidatePath("/teacher");
  redirect(returnHref);
}

async function saveEditedMeanings(client: DbClient, termId: string, termType: string, formData: FormData) {
  const meaningIds = formData.getAll("meaningId").map((value) => String(value));
  const keptMeaningIds: string[] = [];

  for (const [index, meaningId] of meaningIds.entries()) {
    const partOfSpeech = String(formData.get(`meaning-${index}-partOfSpeech`) ?? "").trim();
    const chineseMeaning = String(formData.get(`meaning-${index}-chineseMeaning`) ?? "").trim();
    const exampleSentence = String(formData.get(`meaning-${index}-exampleSentence`) ?? "").trim();
    const explanation = String(formData.get(`meaning-${index}-explanation`) ?? "").trim();
    const usageContext = String(formData.get(`meaning-${index}-usageContext`) ?? "").trim();
    const hasContent = Boolean(chineseMeaning || exampleSentence || explanation || usageContext || partOfSpeech);
    if (!hasContent) continue;

    const data = {
      partOfSpeech: termType === "word" ? partOfSpeech || null : null,
      chineseMeaning,
      exampleSentence: exampleSentence || null,
      explanation: explanation || null,
      usageContext: usageContext || null,
      fieldSourcesJson: JSON.stringify({
        partOfSpeech: "edited",
        chineseMeaning: "edited",
        exampleSentence: "edited",
        explanation: "edited",
        usageContext: "edited",
      }),
    };

    if (meaningId) {
      await client.termMeaning.update({
        where: { id: meaningId },
        data,
      });
      keptMeaningIds.push(meaningId);
    } else {
      const created = await client.termMeaning.create({
        data: {
          termId,
          ...data,
        },
        select: { id: true },
      });
      keptMeaningIds.push(created.id);
    }
  }

  await client.termMeaning.deleteMany({
    where: {
      termId,
      id: { notIn: keptMeaningIds },
    },
  });
}

async function saveEditedCategory(client: DbClient, termId: string, rootGroupId: string, selectedGroupId: string) {
  if (!rootGroupId || !selectedGroupId) return;
  const scopeIds = await getGroupScopeIds(client, rootGroupId);
  if (!scopeIds.includes(selectedGroupId)) return;

  await client.termGroup.deleteMany({
    where: {
      termId,
      groupId: { in: scopeIds },
    },
  });
  await client.termGroup.upsert({
    where: {
      termId_groupId: {
        termId,
        groupId: selectedGroupId,
      },
    },
    update: {},
    create: {
      termId,
      groupId: selectedGroupId,
    },
  });
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

function normalizeTeacherReturnHref(value: string) {
  if (value.startsWith("/teacher?")) return value;
  return "/teacher?menu=materials";
}
