import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";

export const GROUP_IMPORT_SOURCE_TYPE_MD = "md";

type AliasDbClient = typeof prisma | Prisma.TransactionClient;

export function normalizeGroupImportSourceSegment(value: string) {
  return value
    .replace(/\u3000/g, " ")
    .replace(/\s*-\s*/g, "-")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

export function buildGroupImportSourceKey(rootGroupId: string, sourcePath: string[], sourceType = GROUP_IMPORT_SOURCE_TYPE_MD) {
  const encodedPath = sourcePath.map((segment) => encodeURIComponent(normalizeGroupImportSourceSegment(segment))).join("/");
  return `${sourceType}:${rootGroupId}:${encodedPath}`;
}

export function buildGroupImportSourceName(sourcePath: string[]) {
  return sourcePath.map((segment) => segment.trim()).filter(Boolean).join(" / ");
}

export async function resolveImportCategoryGroupId(client: AliasDbClient, rootGroupId: string, categoryPath: string[] | undefined) {
  const cleanedPath = (categoryPath ?? []).map((segment) => segment.trim()).filter(Boolean);
  if (cleanedPath.length === 0) return rootGroupId;

  let parentId = rootGroupId;
  const sourcePath: string[] = [];

  for (const segment of cleanedPath) {
    sourcePath.push(segment);
    const sourceKey = buildGroupImportSourceKey(rootGroupId, sourcePath);
    const alias = await client.groupImportAlias.findUnique({
      where: {
        sourceType_sourceKey: {
          sourceType: GROUP_IMPORT_SOURCE_TYPE_MD,
          sourceKey,
        },
      },
      select: { groupId: true },
    });
    if (alias) {
      parentId = alias.groupId;
      continue;
    }

    const existing = await client.group.findFirst({
      where: { parentId, name: segment },
      select: { id: true },
    });
    const groupId = existing?.id ?? (await createChildGroup(client, parentId, segment)).id;
    await createGroupImportAliasIfMissing(client, groupId, sourceKey, buildGroupImportSourceName(sourcePath));
    parentId = groupId;
  }

  return parentId;
}

export async function createRenameImportAliasForGroup(client: AliasDbClient, groupId: string) {
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
  if (!group || !group.parent) return;

  const root = group.parent.parent ?? group.parent;
  const sourcePath = group.parent.parent ? [group.parent.name, group.name] : [group.name];
  await createGroupImportAliasIfMissing(
    client,
    group.id,
    buildGroupImportSourceKey(root.id, sourcePath),
    buildGroupImportSourceName(sourcePath),
  );
}

async function createChildGroup(client: AliasDbClient, parentId: string, name: string) {
  const sibling = await client.group.findFirst({
    where: { parentId },
    orderBy: { sortOrder: "desc" },
    select: { sortOrder: true },
  });
  return client.group.create({
    data: {
      name,
      parentId,
      sortOrder: (sibling?.sortOrder ?? 0) + 1,
    },
    select: { id: true },
  });
}

async function createGroupImportAliasIfMissing(client: AliasDbClient, groupId: string, sourceKey: string, sourceName: string) {
  try {
    await client.groupImportAlias.create({
      data: {
        groupId,
        sourceType: GROUP_IMPORT_SOURCE_TYPE_MD,
        sourceKey,
        sourceName,
      },
    });
  } catch (error) {
    if (!(error instanceof Prisma.PrismaClientKnownRequestError) || error.code !== "P2002") {
      throw error;
    }
  }
}
