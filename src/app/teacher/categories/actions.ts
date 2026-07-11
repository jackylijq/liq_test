"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  buildCategoryMaintenanceHref,
  canDeleteCategoryGroup,
  isDuplicateCategoryError,
  normalizeCategoryName,
} from "@/lib/teacher/category-maintenance";
import { prisma } from "@/lib/db";
import { createRenameImportAliasForGroup } from "@/lib/teacher/group-import-aliases";

export async function createCategoryAction(formData: FormData) {
  const name = normalizeCategoryName(formData.get("name"));
  const parentId = String(formData.get("parentId") ?? "").trim() || null;
  const expandedRootId = String(formData.get("expandedRootId") ?? "").trim() || parentId;
  if (!name) redirect(buildCategoryMaintenanceHref({ expandedRootId, error: "empty-name" }));

  const sibling = await prisma.group.findFirst({
    where: { parentId },
    orderBy: { sortOrder: "desc" },
    select: { sortOrder: true },
  });

  try {
    await prisma.group.create({
      data: {
        name,
        parentId,
        sortOrder: (sibling?.sortOrder ?? 0) + 1,
      },
    });
  } catch (error) {
    if (isDuplicateCategoryError(error)) {
      redirect(buildCategoryMaintenanceHref({ expandedRootId, error: "duplicate-name" }));
    }
    throw error;
  }

  revalidatePath("/teacher");
  redirect(buildCategoryMaintenanceHref({ expandedRootId }));
}

export async function renameCategoryAction(formData: FormData) {
  const id = String(formData.get("id") ?? "").trim();
  const name = normalizeCategoryName(formData.get("name"));
  const expandedRootId = String(formData.get("expandedRootId") ?? "").trim() || null;
  if (!id) redirect(buildCategoryMaintenanceHref({ expandedRootId }));
  if (!name) redirect(buildCategoryMaintenanceHref({ expandedRootId, error: "empty-name" }));

  try {
    await prisma.$transaction(async (tx) => {
      await createRenameImportAliasForGroup(tx, id);
      await tx.group.update({
        where: { id },
        data: { name },
      });
    });
  } catch (error) {
    if (isDuplicateCategoryError(error)) {
      redirect(buildCategoryMaintenanceHref({ expandedRootId, error: "duplicate-name" }));
    }
    throw error;
  }

  revalidatePath("/teacher");
  redirect(buildCategoryMaintenanceHref({ expandedRootId }));
}

export async function deleteCategoryAction(formData: FormData) {
  const id = String(formData.get("id") ?? "").trim();
  const expandedRootId = String(formData.get("expandedRootId") ?? "").trim() || null;
  if (!id) redirect(buildCategoryMaintenanceHref({ expandedRootId }));

  const group = await prisma.group.findUnique({
    where: { id },
    select: {
      id: true,
      parentId: true,
      _count: {
        select: {
          children: true,
          termLinks: true,
        },
      },
    },
  });
  if (!group) redirect(buildCategoryMaintenanceHref({ expandedRootId }));

  const deletion = canDeleteCategoryGroup({
    childrenCount: group._count.children,
    termLinkCount: group._count.termLinks,
  });
  if (!deletion.canDelete) {
    redirect(buildCategoryMaintenanceHref({ expandedRootId, error: group._count.children > 0 ? "has-children" : "has-terms" }));
  }

  await prisma.group.delete({ where: { id } });
  revalidatePath("/teacher");
  redirect(buildCategoryMaintenanceHref({ expandedRootId: group.parentId ? expandedRootId : null }));
}
