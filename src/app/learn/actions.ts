"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { buildLearningReturnHref, DEFAULT_STUDENT_USER_KEY, normalizeLearningStatus } from "@/lib/learning/progress";

export async function updateLearningProgressAction(formData: FormData) {
  const termId = String(formData.get("termId") ?? "").trim();
  if (!termId) throw new Error("缺少词条 ID");

  const status = normalizeLearningStatus(formData.get("status"));
  const returnHref = buildLearningReturnHref({
    groupId: stringValue(formData.get("groupId")),
    unitId: stringValue(formData.get("unitId")),
    categoryId: stringValue(formData.get("categoryId")),
    progressStatus: stringValue(formData.get("progressStatus")),
  });

  await prisma.learningProgress.upsert({
    where: {
      userKey_termId: {
        userKey: DEFAULT_STUDENT_USER_KEY,
        termId,
      },
    },
    update: { status },
    create: {
      userKey: DEFAULT_STUDENT_USER_KEY,
      termId,
      status,
    },
  });

  revalidatePath("/learn");
  redirect(returnHref);
}

export async function clearLearningProgressAction() {
  await prisma.learningProgress.deleteMany({
    where: { userKey: DEFAULT_STUDENT_USER_KEY },
  });
  revalidatePath("/learn");
  redirect("/learn?menu=word-learning");
}

function stringValue(value: FormDataEntryValue | null) {
  const text = typeof value === "string" ? value.trim() : "";
  return text || undefined;
}
