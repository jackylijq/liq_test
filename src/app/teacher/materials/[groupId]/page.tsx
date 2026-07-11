import Link from "next/link";
import {
  getTeacherContentOutline,
  getTeacherGroupTerms,
  getTeacherGroups,
  selectTeacherGroup,
  summarizeTeacherTerms,
} from "@/lib/teacher/groups";
import { getMeaningLines, getVisibleExampleSentences, getVisibleExplanationLines, shouldShowUsageContext } from "@/lib/terms/display";
import { buildPronunciationAudioUrl } from "@/lib/terms/pronunciation";

type TeacherMaterialDetailPageProps = {
  params: Promise<{ groupId: string }>;
  searchParams: Promise<{ unitId?: string; categoryId?: string; importBatchId?: string; error?: string }>;
};

export default async function TeacherMaterialDetailPage({ params, searchParams }: TeacherMaterialDetailPageProps) {
  const routeParams = await params;
  const query = await searchParams;
  const groups = await getTeacherGroups();
  const selectedGroup = selectTeacherGroup(groups, routeParams.groupId);
  const outline = selectedGroup ? await getTeacherContentOutline(selectedGroup.id) : [];
  const selectedUnit = outline.find((unit) => unit.id === query.unitId || unit.categories.some((category) => category.id === query.categoryId));
  const selectedCategory = selectedUnit?.categories.find((category) => category.id === query.categoryId);
  const contentGroupId = selectedCategory?.id ?? selectedUnit?.id ?? selectedGroup?.id;
  const terms = contentGroupId ? await getTeacherGroupTerms(contentGroupId) : [];
  const summary = summarizeTeacherTerms(terms);
  const contentTitle = selectedCategory?.name ?? selectedUnit?.name ?? selectedGroup?.name ?? "暂无分类";
  const enrichHref = contentGroupId ? `/teacher/enrich?groupId=${contentGroupId}` : "/teacher/enrich";

  return (
    <main className="teacher-material-detail-page">
      <header className="teacher-header">
        <div>
          <p className="eyebrow">单词资料</p>
          <h1>{contentTitle}</h1>
        </div>
        <div className="teacher-header-actions">
          {selectedGroup ? (
            <>
              <Link className="primary-link" href={`/teacher/import?groupId=${selectedGroup.id}`}>
                新增内容
              </Link>
              <Link className="secondary-link" href={enrichHref}>
                补齐
              </Link>
            </>
          ) : null}
          <Link className="secondary-link" href="/teacher/materials">
            返回资料
          </Link>
        </div>
      </header>

      <section className="teacher-material-detail-stats" aria-label="资料统计">
        <span>单词 {summary.wordCount}</span>
        <span>短语 {summary.phraseCount}</span>
        <span>句子 {summary.sentenceCount}</span>
        <span>待补全 {summary.missingFieldCount}</span>
      </section>

      {query.error === "empty-import" ? <p className="form-error">请先上传文件或填写导入内容。</p> : null}
      {query.importBatchId && selectedGroup ? (
        <section className="import-success-panel">
          <span>已导入以下内容。</span>
          <Link href={`/teacher/materials/${selectedGroup.id}`}>查看当前资料全部内容</Link>
        </section>
      ) : null}

      {!selectedGroup ? <section className="panel">暂无分类，请先运行种子数据。</section> : null}

      {selectedGroup && outline.length > 0 ? (
        <section className="teacher-outline-panel" aria-label="单元与内容筛选">
          <nav className="teacher-unit-tabs" aria-label="单元筛选">
            {outline.map((unit) => (
              <Link
                className={unit.id === selectedUnit?.id ? "active" : ""}
                href={`/teacher/materials/${selectedGroup.id}?unitId=${unit.id}`}
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
                  href={`/teacher/materials/${selectedGroup.id}?unitId=${selectedUnit.id}&categoryId=${category.id}`}
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
        {terms.length === 0 ? (
          <p className="empty-state">当前分类暂无内容。</p>
        ) : (
          terms.map((term) => (
            <article className="teacher-term-card" key={term.id}>
              <div>
                <strong>{term.text}</strong>
                {term.termType === "word" && term.phoneticSymbol ? <span>{term.phoneticSymbol}</span> : null}
                {term.termType === "word" ? (
                  <audio aria-label={`${term.text} 发音`} controls preload="none" src={buildPronunciationAudioUrl(term.text)} />
                ) : null}
                {term.termType === "word" ? <span>{term.meanings[0]?.partOfSpeech}</span> : null}
                {term.termType === "phrase" ? <span>短语</span> : null}
                {term.termType === "sentence" ? <span>句子</span> : null}
              </div>
              {getMeaningLines(term.termType, term.meanings, term.text).map((line, index) => (
                <p key={`${term.id}-meaning-${index}`}>{line}</p>
              ))}
              {getVisibleExampleSentences(term.termType, term.text, term.meanings).map((sentence, index) => (
                <p key={`${term.id}-example-${index}`}>{sentence}</p>
              ))}
              {getVisibleExplanationLines(term.meanings).map((explanation, index) => (
                <p key={`${term.id}-explanation-${index}`}>{explanation}</p>
              ))}
              {term.meanings.map((meaning, index) =>
                shouldShowUsageContext(meaning) ? <p key={`${term.id}-usage-${index}`}>{meaning.usageContext}</p> : null,
              )}
            </article>
          ))
        )}
      </section>
    </main>
  );
}
