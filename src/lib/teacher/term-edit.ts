import type { TermType } from "@/lib/types";

export function normalizeEditableTermType(value?: string | null): TermType {
  if (value === "phrase" || value === "sentence" || value === "word") return value;
  return "word";
}

export function buildTeacherTermEditReturnHref({
  groupId,
  unitId,
  categoryId,
}: {
  groupId?: string | null;
  unitId?: string | null;
  categoryId?: string | null;
}) {
  if (!groupId) return "/teacher?menu=materials";
  const searchParams = new URLSearchParams({ menu: "materials", groupId });
  if (unitId) searchParams.set("unitId", unitId);
  if (categoryId) searchParams.set("categoryId", categoryId);
  return `/teacher?${searchParams.toString()}`;
}
