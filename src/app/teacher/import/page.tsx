import Link from "next/link";
import { parseImportAction } from "./actions";
import { getTeacherGroups, selectTeacherGroup } from "@/lib/teacher/groups";

type TeacherImportPageProps = {
  searchParams: Promise<{ groupId?: string; error?: string }>;
};

export default async function TeacherImportPage({ searchParams }: TeacherImportPageProps) {
  const params = await searchParams;
  const groups = await getTeacherGroups();
  const selectedGroup = selectTeacherGroup(groups, params.groupId);

  return (
    <main className="page">
      <section className="panel teacher-import-panel">
        <div className="import-page-header">
          <div>
            <p className="eyebrow">目标分类</p>
            <h1>{selectedGroup?.name ?? "暂无分类"}</h1>
          </div>
          <Link href={selectedGroup ? `/teacher?menu=materials&groupId=${selectedGroup.id}` : "/teacher?menu=materials"}>返回资料</Link>
        </div>

        {params.error === "empty-import" ? <p className="form-error">请先上传文件或填写导入内容。</p> : null}

        {selectedGroup ? (
          <form action={parseImportAction} className="import-form">
            <input type="hidden" name="targetGroupId" value={selectedGroup.id} />
            <label htmlFor="file">上传 MD/TXT 新增词条，或 PDF/Word 补充匹配</label>
            <input
              id="file"
              name="file"
              type="file"
              accept=".md,.markdown,.pdf,.docx,.txt,text/markdown,text/plain,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
            />
            <label htmlFor="content">粘贴 MD/TXT 导入内容</label>
            <textarea id="content" name="content" rows={10} />
            <button type="submit">解析到当前资料</button>
          </form>
        ) : (
          <p className="empty-state">暂无分类，请先运行种子数据。</p>
        )}
      </section>
    </main>
  );
}
