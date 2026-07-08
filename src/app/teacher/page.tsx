import Link from "next/link";
import { parseImportAction } from "./import/actions";
import {
  getTeacherGroups,
  getTeacherGroupTerms,
  selectTeacherGroup,
  summarizeTeacherTerms,
} from "@/lib/teacher/groups";

type TeacherPageProps = {
  searchParams: Promise<{ groupId?: string; tab?: string; error?: string }>;
};

export default async function TeacherPage({ searchParams }: TeacherPageProps) {
  const params = await searchParams;
  const groups = await getTeacherGroups();
  const selectedGroup = selectTeacherGroup(groups, params.groupId);
  const terms = selectedGroup ? await getTeacherGroupTerms(selectedGroup.id) : [];
  const summary = summarizeTeacherTerms(terms);
  const activeTab = params.tab === "phrase" ? "phrase" : "word";
  const visibleTerms = terms.filter((term) => term.termType === activeTab);

  return (
    <main className="teacher-workbench">
      <aside className="teacher-sidebar" aria-label="分类大纲">
        <h1>老师工作台</h1>
        <nav className="teacher-groups">
          {groups.map((group) => (
            <Link
              className={group.id === selectedGroup?.id ? "teacher-group active" : "teacher-group"}
              href={`/teacher?groupId=${group.id}&tab=${activeTab}`}
              key={group.id}
            >
              {group.name}
            </Link>
          ))}
        </nav>
      </aside>

      <section className="teacher-main">
        <header className="teacher-header">
          <div>
            <p className="eyebrow">当前分类</p>
            <h2>{selectedGroup?.name ?? "暂无分类"}</h2>
          </div>
          <div className="teacher-stats">
            <span>单词 {summary.wordCount}</span>
            <span>短语 {summary.phraseCount}</span>
            <span>待补全 {summary.missingFieldCount}</span>
          </div>
        </header>

        {params.error === "empty-import" ? <p className="form-error">请先上传文件或填写导入内容。</p> : null}

        {selectedGroup ? (
          <form action={parseImportAction} className="panel teacher-import-panel">
            <input type="hidden" name="targetGroupId" value={selectedGroup.id} />
            <label htmlFor="file">上传 PDF / Word / TXT 文件</label>
            <input
              id="file"
              name="file"
              type="file"
              accept=".pdf,.docx,.txt,text/plain,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
            />
            <label htmlFor="content">粘贴导入内容</label>
            <textarea id="content" name="content" rows={6} />
            <button type="submit">解析到当前分类</button>
          </form>
        ) : (
          <section className="panel">暂无分类，请先运行种子数据。</section>
        )}

        <div className="teacher-tabs">
          <Link className={activeTab === "word" ? "active" : ""} href={`/teacher?groupId=${selectedGroup?.id ?? ""}&tab=word`}>
            单词
          </Link>
          <Link
            className={activeTab === "phrase" ? "active" : ""}
            href={`/teacher?groupId=${selectedGroup?.id ?? ""}&tab=phrase`}
          >
            短语
          </Link>
        </div>

        <section className="teacher-term-list">
          {visibleTerms.length === 0 ? (
            <p className="empty-state">当前分类暂无{activeTab === "phrase" ? "短语" : "单词"}。</p>
          ) : (
            visibleTerms.map((term) => (
              <article className="teacher-term-card" key={term.id}>
                <div>
                  <strong>{term.text}</strong>
                  {term.termType === "word" ? <span>{term.meanings[0]?.partOfSpeech}</span> : <span>短语</span>}
                </div>
                {term.termType === "word" && term.meanings[0]?.exampleSentence ? (
                  <p>{term.meanings[0].exampleSentence}</p>
                ) : null}
                {term.termType === "phrase" && term.meanings[0]?.usageContext ? (
                  <p>{term.meanings[0].usageContext}</p>
                ) : null}
                <p>{term.meanings.map((meaning) => meaning.chineseMeaning).filter(Boolean).join("；")}</p>
              </article>
            ))
          )}
        </section>
      </section>
    </main>
  );
}
