import { describe, expect, it } from "vitest";
import { buildCategoryMaintenanceTree, canDeleteCategoryGroup, flattenExpandedCategoryGroups } from "@/lib/teacher/category-maintenance";

const groups = [
  { id: "root-2", name: "8年级上册", parentId: null, sortOrder: 2, childrenCount: 0, termLinkCount: 0 },
  { id: "root-1", name: "7年级下册", parentId: null, sortOrder: 1, childrenCount: 2, termLinkCount: 0 },
  { id: "unit-1", name: "Unit 1 Animal Friends", parentId: "root-1", sortOrder: 1, childrenCount: 1, termLinkCount: 0 },
  { id: "section-1", name: "Section A-重点词汇", parentId: "unit-1", sortOrder: 1, childrenCount: 0, termLinkCount: 3 },
  { id: "unit-2", name: "Unit 2 School Life", parentId: "root-1", sortOrder: 2, childrenCount: 0, termLinkCount: 0 },
];

describe("buildCategoryMaintenanceTree", () => {
  it("keeps only top-level categories as tree roots in sort order", () => {
    const tree = buildCategoryMaintenanceTree(groups);

    expect(tree.map((group) => group.id)).toEqual(["root-1", "root-2"]);
    expect(tree[0].children.map((group) => group.id)).toEqual(["unit-1", "unit-2"]);
  });
});

describe("flattenExpandedCategoryGroups", () => {
  it("returns all imported child categories below the expanded root", () => {
    const tree = buildCategoryMaintenanceTree(groups);
    const rows = flattenExpandedCategoryGroups(tree, "root-1");

    expect(rows.map((row) => [row.group.id, row.depth])).toEqual([
      ["unit-1", 1],
      ["section-1", 2],
      ["unit-2", 1],
    ]);
  });

  it("returns no child rows when no root is expanded", () => {
    const tree = buildCategoryMaintenanceTree(groups);

    expect(flattenExpandedCategoryGroups(tree, undefined)).toEqual([]);
  });
});

describe("canDeleteCategoryGroup", () => {
  it("allows deleting only empty leaf categories", () => {
    expect(canDeleteCategoryGroup(groups[4])).toEqual({ canDelete: true });
    expect(canDeleteCategoryGroup(groups[2])).toEqual({ canDelete: false, reason: "该分类下还有子分类，不能删除。" });
    expect(canDeleteCategoryGroup(groups[3])).toEqual({ canDelete: false, reason: "该分类下已有学习内容，不能删除。" });
  });
});
