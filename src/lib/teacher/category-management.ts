import type { TeacherGroupOption, TeacherUnitFilter } from "./groups";

export type TeacherCategoryOption = {
  id: string;
  label: string;
};

export function buildTeacherCategoryOptions(rootGroup: Pick<TeacherGroupOption, "id" | "name">, outline: TeacherUnitFilter[]) {
  const options: TeacherCategoryOption[] = [{ id: rootGroup.id, label: `${rootGroup.name}（默认分类）` }];

  for (const unit of outline) {
    options.push({ id: unit.id, label: unit.name });
    for (const category of unit.categories) {
      options.push({ id: category.id, label: `${unit.name} / ${category.name}` });
    }
  }

  return options;
}
