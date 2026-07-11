import { describe, expect, it } from "vitest";
import {
  classifyTeacherMaterialGroup,
  filterTeacherMaterialGroups,
  getTeacherMaterialCover,
  normalizeTeacherMaterialTab,
} from "@/lib/teacher/materials";

describe("classifyTeacherMaterialGroup", () => {
  it("puts primary and junior grade groups into expected material tabs", () => {
    expect(classifyTeacherMaterialGroup("3年级上册")).toBe("primary");
    expect(classifyTeacherMaterialGroup("7年级下册")).toBe("junior");
    expect(classifyTeacherMaterialGroup("校本资料")).toBe("other");
  });
});

describe("filterTeacherMaterialGroups", () => {
  const groups = [
    { id: "g3", name: "3年级上册", isFavorite: false },
    { id: "g7", name: "7年级下册", isFavorite: true },
    { id: "custom", name: "校本资料", isFavorite: true },
  ];

  it("filters groups for top-level material tabs", () => {
    expect(filterTeacherMaterialGroups(groups, "all").map((group) => group.id)).toEqual(["g3", "g7", "custom"]);
    expect(filterTeacherMaterialGroups(groups, "primary").map((group) => group.id)).toEqual(["g3"]);
    expect(filterTeacherMaterialGroups(groups, "junior").map((group) => group.id)).toEqual(["g7"]);
    expect(filterTeacherMaterialGroups(groups, "other").map((group) => group.id)).toEqual(["custom"]);
    expect(filterTeacherMaterialGroups(groups, "favorite").map((group) => group.id)).toEqual(["g7", "custom"]);
  });
});

describe("normalizeTeacherMaterialTab", () => {
  it("falls back to favorite for missing or unknown tabs", () => {
    expect(normalizeTeacherMaterialTab()).toBe("favorite");
    expect(normalizeTeacherMaterialTab("bad")).toBe("favorite");
    expect(normalizeTeacherMaterialTab("favorite")).toBe("favorite");
  });
});

describe("getTeacherMaterialCover", () => {
  it("uses different cover labels for primary and junior groups", () => {
    expect(getTeacherMaterialCover("3年级上册").label).toBe("PEP 小学英语");
    expect(getTeacherMaterialCover("8年级上册").label).toBe("人教版初中英语");
  });
});
