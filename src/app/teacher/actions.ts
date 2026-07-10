"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";

export async function renameTeacherGroupAction(formData: FormData) {
  const groupId = String(formData.get("groupId") ?? "").trim();
  const name = String(formData.get("name") ?? "").trim();
  const returnTo = getSafeTeacherReturnTo(formData);

  if (groupId && name) {
    await prisma.group.update({
      where: { id: groupId },
      data: { name },
    });
    revalidatePath("/teacher");
    revalidatePath("/learn");
  }

  redirect(returnTo);
}

export async function moveTeacherTermGroupAction(formData: FormData) {
  const termId = String(formData.get("termId") ?? "").trim();
  const rootGroupId = String(formData.get("rootGroupId") ?? "").trim();
  const targetGroupId = String(formData.get("targetGroupId") ?? "").trim();
  const returnTo = getSafeTeacherReturnTo(formData);

  if (!termId || !rootGroupId || !targetGroupId) {
    redirect(returnTo);
  }

  const rootId = await getRootGroupId(rootGroupId);
  const targetPath = await getTargetPathIds(targetGroupId, rootId);
  const rootScopeIds = await getGroupScopeIds(rootId);

  await prisma.$transaction(async (tx) => {
    await tx.termGroup.deleteMany({
      where: {
        termId,
        groupId: { in: rootScopeIds },
      },
    });

    for (const groupId of targetPath) {
      await tx.termGroup.create({
        data: {
          termId,
          groupId,
        },
      });
    }
  });

  revalidatePath("/teacher");
  revalidatePath("/learn");
  redirect(returnTo);
}

function getSafeTeacherReturnTo(formData: FormData) {
  const returnTo = String(formData.get("returnTo") ?? "").trim();
  return returnTo.startsWith("/teacher") ? returnTo : "/teacher";
}

async function getRootGroupId(groupId: string) {
  const group = await prisma.group.findUnique({
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

async function getGroupScopeIds(groupId: string) {
  const groupIds = [groupId];
  let frontier = [groupId];

  while (frontier.length > 0) {
    const children = await prisma.group.findMany({
      where: { parentId: { in: frontier } },
      select: { id: true },
    });
    frontier = children.map((child) => child.id);
    groupIds.push(...frontier);
  }

  return groupIds;
}

async function getTargetPathIds(targetGroupId: string, rootGroupId: string) {
  const path: string[] = [];
  let cursorId: string | null = targetGroupId;

  while (cursorId) {
    const group: { id: string; parentId: string | null } | null = await prisma.group.findUnique({
      where: { id: cursorId },
      select: { id: true, parentId: true },
    });
    if (!group) break;
    path.unshift(group.id);
    if (group.id === rootGroupId) return path;
    cursorId = group.parentId;
  }

  return [rootGroupId];
}
