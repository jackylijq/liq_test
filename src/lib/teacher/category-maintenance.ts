import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { getTeacherGroups } from "./groups";

export type CategoryMaintenanceGroup = {
  id: string;
  name: string;
  parentId: string | null;
  sortOrder: number;
  childrenCount: number;
  termLinkCount: number;
};

export type CategoryMaintenanceNode = CategoryMaintenanceGroup & {
  children: CategoryMaintenanceNode[];
};

export type ExpandedCategoryRow = {
  group: CategoryMaintenanceNode;
  depth: number;
};

export async function getCategoryMaintenanceTree() {
  await getTeacherGroups();
  const groups = await prisma.group.findMany({
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    select: {
      id: true,
      name: true,
      parentId: true,
      sortOrder: true,
      _count: {
        select: {
          children: true,
          termLinks: true,
        },
      },
    },
  });

  return buildCategoryMaintenanceTree(
    groups.map((group) => ({
      id: group.id,
      name: group.name,
      parentId: group.parentId,
      sortOrder: group.sortOrder,
      childrenCount: group._count.children,
      termLinkCount: group._count.termLinks,
    })),
  );
}

export function normalizeCategoryName(value: FormDataEntryValue | null) {
  return String(value ?? "").replace(/\s+/g, " ").trim();
}

export function buildCategoryMaintenanceHref(params: { expandedRootId?: string | null; error?: string | null } = {}) {
  const searchParams = new URLSearchParams({ menu: "categories" });
  if (params.expandedRootId) searchParams.set("expandedRootId", params.expandedRootId);
  if (params.error) searchParams.set("error", params.error);
  return `/teacher?${searchParams.toString()}`;
}

export function isDuplicateCategoryError(error: unknown) {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002";
}

export function buildCategoryMaintenanceTree(groups: CategoryMaintenanceGroup[]): CategoryMaintenanceNode[] {
  const byId = new Map<string, CategoryMaintenanceNode>();
  for (const group of groups) {
    byId.set(group.id, { ...group, children: [] });
  }

  const roots: CategoryMaintenanceNode[] = [];
  for (const node of byId.values()) {
    if (node.parentId && byId.has(node.parentId)) {
      byId.get(node.parentId)?.children.push(node);
    } else {
      roots.push(node);
    }
  }

  sortCategoryNodes(roots);
  return roots;
}

export function flattenExpandedCategoryGroups(
  tree: CategoryMaintenanceNode[],
  expandedRootId: string | null | undefined,
): ExpandedCategoryRow[] {
  if (!expandedRootId) return [];
  const root = tree.find((node) => node.id === expandedRootId);
  if (!root) return [];

  const rows: ExpandedCategoryRow[] = [];
  appendChildRows(root.children, 1, rows);
  return rows;
}

export function canDeleteCategoryGroup(group: Pick<CategoryMaintenanceGroup, "childrenCount" | "termLinkCount">) {
  if (group.childrenCount > 0) {
    return { canDelete: false, reason: "该分类下还有子分类，不能删除。" };
  }
  if (group.termLinkCount > 0) {
    return { canDelete: false, reason: "该分类下已有学习内容，不能删除。" };
  }
  return { canDelete: true };
}

function appendChildRows(nodes: CategoryMaintenanceNode[], depth: number, rows: ExpandedCategoryRow[]) {
  for (const node of nodes) {
    rows.push({ group: node, depth });
    appendChildRows(node.children, depth + 1, rows);
  }
}

function sortCategoryNodes(nodes: CategoryMaintenanceNode[]) {
  nodes.sort((left, right) => {
    const sortOrder = left.sortOrder - right.sortOrder;
    if (sortOrder !== 0) return sortOrder;
    return left.name.localeCompare(right.name, "zh-CN");
  });
  for (const node of nodes) {
    sortCategoryNodes(node.children);
  }
}
