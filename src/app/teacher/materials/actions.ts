"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { DEFAULT_TEACHER_USER_KEY, normalizeTeacherMaterialTab } from "@/lib/teacher/materials";

export async function toggleTeacherMaterialFavoriteAction(formData: FormData) {
  const groupId = String(formData.get("groupId") ?? "").trim();
  const tab = normalizeTeacherMaterialTab(String(formData.get("tab") ?? ""));
  if (!groupId) {
    redirect(`/teacher?menu=materials&tab=${tab}`);
  }

  const existing = await prisma.teacherMaterialFavorite.findUnique({
    where: {
      userKey_groupId: {
        userKey: DEFAULT_TEACHER_USER_KEY,
        groupId,
      },
    },
  });

  if (existing) {
    await prisma.teacherMaterialFavorite.delete({ where: { id: existing.id } });
  } else {
    await prisma.teacherMaterialFavorite.create({
      data: {
        userKey: DEFAULT_TEACHER_USER_KEY,
        groupId,
      },
    });
  }

  revalidatePath("/teacher");
  revalidatePath("/teacher/materials");
  redirect(`/teacher?menu=materials&tab=${tab}`);
}
