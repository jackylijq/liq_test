import { prisma } from "@/lib/db";
import { getTeacherGroupTerms, getTeacherGroups, summarizeTeacherTerms } from "./groups";

export const DEFAULT_TEACHER_USER_KEY = "default-teacher";

export type MaterialTab = "favorite" | "all" | "primary" | "junior" | "other";

export type TeacherMaterialGroup = {
  id: string;
  name: string;
  isFavorite?: boolean;
};

export function classifyTeacherMaterialGroup(name: string): Exclude<MaterialTab, "favorite" | "all"> {
  if (/^[1-6]年级/.test(name)) return "primary";
  if (/^[7-9]年级/.test(name)) return "junior";
  return "other";
}

export function filterTeacherMaterialGroups<T extends TeacherMaterialGroup>(groups: T[], tab: MaterialTab) {
  if (tab === "all") return groups;
  if (tab === "favorite") return groups.filter((group) => group.isFavorite);
  return groups.filter((group) => classifyTeacherMaterialGroup(group.name) === tab);
}

export function normalizeTeacherMaterialTab(value?: string | null): MaterialTab {
  if (value === "favorite" || value === "all" || value === "primary" || value === "junior" || value === "other") {
    return value;
  }
  return "favorite";
}

export function getTeacherMaterialCover(name: string) {
  const type = classifyTeacherMaterialGroup(name);
  if (type === "primary") {
    return {
      imageUrl: "https://q7.itc.cn/q_70/images01/20240930/3fdb4bc664c947f193e2d3e4c97798a8.jpeg",
      label: "PEP 小学英语",
    };
  }
  if (type === "junior") {
    return {
      imageUrl: "https://q6.itc.cn/q_70/images01/20240930/1075f5ba15d04a2a9965657491bbd3d0.jpeg",
      label: "人教版初中英语",
    };
  }
  return {
    imageUrl: "https://q6.itc.cn/q_70/images01/20240930/1075f5ba15d04a2a9965657491bbd3d0.jpeg",
    label: "英语资料",
  };
}

export async function getTeacherMaterialCards(userKey = DEFAULT_TEACHER_USER_KEY) {
  const groups = await getTeacherGroups();
  const favorites = await prisma.teacherMaterialFavorite.findMany({
    where: { userKey },
    select: { groupId: true },
  });
  const favoriteIds = new Set(favorites.map((favorite) => favorite.groupId));

  return Promise.all(
    groups.map(async (group) => {
      const terms = await getTeacherGroupTerms(group.id);
      const summary = summarizeTeacherTerms(terms);
      return {
        ...group,
        ...getTeacherMaterialCover(group.name),
        isFavorite: favoriteIds.has(group.id),
        terms,
        summary,
      };
    }),
  );
}
