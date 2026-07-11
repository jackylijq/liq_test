import Link from "next/link";
import { TeacherCategoryMaintenanceContent } from "./categories/TeacherCategoryMaintenanceContent";
import { TeacherMaterialDetailContent } from "./materials/TeacherMaterialDetailContent";
import { TeacherMaterialsContent } from "./materials/TeacherMaterialsContent";

type TeacherPageProps = {
  searchParams: Promise<{
    menu?: string;
    tab?: string;
    groupId?: string;
    unitId?: string;
    categoryId?: string;
    importBatchId?: string;
    expandedRootId?: string;
    error?: string;
  }>;
};

const teacherMenus = [
  { id: "materials", label: "单词资料", href: "/teacher?menu=materials" },
  { id: "categories", label: "分类维护", href: "/teacher?menu=categories" },
];

export default async function TeacherPage({ searchParams }: TeacherPageProps) {
  const params = await searchParams;
  const activeMenu = params.menu === "categories" ? "categories" : "materials";

  return (
    <main className="teacher-workbench">
      <aside className="teacher-sidebar">
        <h1>老师工作台</h1>
        <nav className="teacher-groups" aria-label="老师菜单">
          {teacherMenus.map((menu) => (
            <Link className={menu.id === activeMenu ? "teacher-group active" : "teacher-group"} href={menu.href} key={menu.id}>
              {menu.label}
            </Link>
          ))}
        </nav>
      </aside>

      <section className="teacher-main">
        {activeMenu === "categories" ? (
          <TeacherCategoryMaintenanceContent error={params.error} expandedRootId={params.expandedRootId} />
        ) : params.groupId ? (
          <TeacherMaterialDetailContent
            categoryId={params.categoryId}
            error={params.error}
            groupId={params.groupId}
            importBatchId={params.importBatchId}
            unitId={params.unitId}
          />
        ) : (
          <TeacherMaterialsContent tab={params.tab} />
        )}
      </section>
    </main>
  );
}
