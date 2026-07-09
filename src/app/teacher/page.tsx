import Link from "next/link";
import { parseImportAction } from "./import/actions";
import {
  getTeacherContentOutline,
  getTeacherGroups,
  getTeacherGroupTerms,
  selectTeacherGroup,
  summarizeTeacherTerms,
} from "@/lib/teacher/groups";
import { getMeaningLines, shouldShowExampleSentence, shouldShowUsageContext } from "@/lib/terms/display";

type TeacherPageProps = {
  searchParams: Promise<{ groupId?: string; unitId?: string; categoryId?: string; error?: string }>;
};

export default async function TeacherPage({ searchParams }: TeacherPageProps) {
  const params = await searchParams;
  const groups = await getTeacherGroups();
  const selectedGroup = selectTeacherGroup(groups, params.groupId);
  const outline = selectedGroup ? await getTeacherContentOutline(selectedGroup.id) : [];
  const selectedUnit = outline.find((unit) => unit.id === params.unitId || unit.categories.some((category) => category.id === params.categoryId));
  const selectedCategory = selectedUnit?.categories.find((category) => category.id === params.categoryId);
  const contentGroupId = selectedCategory?.id ?? selectedUnit?.id ?? selectedGroup?.id;
  const terms = contentGroupId ? await getTeacherGroupTerms(contentGroupId) : [];
  const summary = summarizeTeacherTerms(terms);
  const visibleTerms = terms;
  const contentTitle = selectedCategory?.name ?? selectedUnit?.name ?? selectedGroup?.name ?? "暂无分类";

  return (
    <main className="teacher-workbench">
      <aside className="teacher-sidebar" aria-label="分类大纲">
        <h1>老师工作台</h1>
        <nav className="teacher-groups">
          {groups.map((group) => (
            <Link
              className={group.id === selectedGroup?.id ? "teacher-group active" : "teacher-group"}
              href={`/teacher?groupId=${group.id}`}
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
            <h2>{contentTitle}</h2>
          </div>
          <div className="teacher-stats">
            <span>单词 {summary.wordCount}</span>
            <span>短语 {summary.phraseCount}</span>
            <span>句子 {summary.sentenceCount}</span>
            <span>待补全 {summary.missingFieldCount}</span>
          </div>
        </header>

        {params.error === "empty-import" ? <p className="form-error">请先上传文件或填写导入内容。</p> : null}

        {selectedGroup ? (
          <form action={parseImportAction} className="panel teacher-import-panel">
            <input type="hidden" name="targetGroupId" value={selectedGroup.id} />
            <label htmlFor="file">上传 MD/TXT 新增词条，或 PDF/Word 补充匹配</label>
            <input
              id="file"
              name="file"
              type="file"
              accept=".md,.markdown,.pdf,.docx,.txt,text/markdown,text/plain,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
            />
            <label htmlFor="content">粘贴 MD/TXT 导入内容</label>
            <textarea id="content" name="content" rows={6} />
            <button type="submit">解析到当前分类</button>
          </form>
        ) : (
          <section className="panel">暂无分类，请先运行种子数据。</section>
        )}

        {selectedGroup && outline.length > 0 ? (
          <section className="teacher-outline-panel" aria-label="单元与内容筛选">
            <nav className="teacher-unit-tabs" aria-label="单元筛选">
              {outline.map((unit) => (
                <Link
                  className={unit.id === selectedUnit?.id ? "active" : ""}
                  href={`/teacher?groupId=${selectedGroup.id}&unitId=${unit.id}`}
                  key={unit.id}
                >
                  {unit.name}
                </Link>
              ))}
            </nav>
            {selectedUnit ? (
              <nav className="teacher-filter-tabs" aria-label="内容筛选">
                {selectedUnit.categories.map((category) => (
                  <Link
                    className={category.id === selectedCategory?.id ? "active" : ""}
                    href={`/teacher?groupId=${selectedGroup.id}&unitId=${selectedUnit.id}&categoryId=${category.id}`}
                    key={category.id}
                  >
                    {category.name}
                  </Link>
                ))}
              </nav>
            ) : null}
          </section>
        ) : null}

        <section className="teacher-term-list">
          {visibleTerms.length === 0 ? (
            <p className="empty-state">当前分类暂无内容。</p>
          ) : (
            visibleTerms.map((term) => (
              <article className="teacher-term-card" key={term.id}>
                <div>
                  <strong>{term.text}</strong>
                  {term.termType === "word" ? <span>{term.meanings[0]?.partOfSpeech}</span> : null}
                  {term.termType === "phrase" ? <span>短语</span> : null}
                  {term.termType === "sentence" ? <span>句子</span> : null}
                </div>
                {getMeaningLines(term.termType, term.meanings, term.text).map((line, index) => (
                  <p key={`${term.id}-meaning-${index}`}>{line}</p>
                ))}
                {term.termType === "word" && shouldShowExampleSentence(term.termType, term.text, term.meanings[0]?.exampleSentence) ? (
                  <p>{term.meanings[0].exampleSentence}</p>
                ) : null}
                {term.termType === "sentence" && shouldShowExampleSentence(term.termType, term.text, term.meanings[0]?.exampleSentence) ? (
                  <p>{term.meanings[0].exampleSentence}</p>
                ) : null}
                {term.meanings.map((meaning, index) =>
                  shouldShowUsageContext(meaning) ? <p key={`${term.id}-usage-${index}`}>{meaning.usageContext}</p> : null,
                )}
              </article>
            ))
          )}
        </section>
      </section>
    </main>
  );
}
