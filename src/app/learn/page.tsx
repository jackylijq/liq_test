import Link from "next/link";
import { updateLearningProgressAction } from "./actions";
import { prisma } from "@/lib/db";
import { DEFAULT_STUDENT_USER_KEY, type LearningStatus } from "@/lib/learning/progress";
import {
  getTeacherContentOutline,
  getTeacherGroups,
  getTeacherGroupTerms,
  selectTeacherGroup,
} from "@/lib/teacher/groups";
import { getMeaningLines, getVisibleExampleSentences, getVisibleExplanationLines, shouldShowUsageContext } from "@/lib/terms/display";
import { buildPronunciationAudioUrl } from "@/lib/terms/pronunciation";

export const dynamic = "force-dynamic";

type LearnPageProps = {
  searchParams: Promise<{ groupId?: string; unitId?: string; categoryId?: string }>;
};

export default async function LearnPage({ searchParams }: LearnPageProps) {
  const params = await searchParams;
  const groups = await getTeacherGroups();
  const selectedGroup = selectTeacherGroup(groups, params.groupId);
  const outline = selectedGroup ? await getTeacherContentOutline(selectedGroup.id) : [];
  const selectedUnit = outline.find((unit) => unit.id === params.unitId || unit.categories.some((category) => category.id === params.categoryId));
  const selectedCategory = selectedUnit?.categories.find((category) => category.id === params.categoryId);
  const contentGroupId = selectedCategory?.id ?? selectedUnit?.id ?? selectedGroup?.id;
  const terms = contentGroupId ? await getTeacherGroupTerms(contentGroupId) : [];
  const progressRows =
    terms.length > 0
      ? await prisma.learningProgress.findMany({
          where: {
            userKey: DEFAULT_STUDENT_USER_KEY,
            termId: { in: terms.map((term) => term.id) },
          },
          select: { termId: true, status: true },
        })
      : [];
  const progressByTermId = new Map(progressRows.map((row) => [row.termId, row.status as LearningStatus]));
  const contentTitle = selectedCategory?.name ?? selectedUnit?.name ?? selectedGroup?.name ?? "学习";

  return (
    <main className="student-layout learn-scroll">
      <aside className="group-sidebar">
        <nav className="student-grade-links" aria-label="学习年级">
          {groups.map((group) => (
            <Link className={group.id === selectedGroup?.id ? "active" : ""} href={`/learn?groupId=${group.id}`} key={group.id}>
              {group.name}
            </Link>
          ))}
        </nav>
      </aside>
      <section className="student-content">
        <h1>学习</h1>
        {selectedGroup && outline.length > 0 ? (
          <section className="student-outline-panel" aria-label="学习内容筛选">
            <nav className="teacher-unit-tabs" aria-label="学习单元筛选">
              {outline.map((unit) => (
                <Link
                  className={unit.id === selectedUnit?.id ? "active" : ""}
                  href={`/learn?groupId=${selectedGroup.id}&unitId=${unit.id}`}
                  key={unit.id}
                >
                  {unit.name}
                </Link>
              ))}
            </nav>
            {selectedUnit ? (
              <nav className="teacher-filter-tabs" aria-label="学习小类筛选">
                {selectedUnit.categories.map((category) => (
                  <Link
                    className={category.id === selectedCategory?.id ? "active" : ""}
                    href={`/learn?groupId=${selectedGroup.id}&unitId=${selectedUnit.id}&categoryId=${category.id}`}
                    key={category.id}
                  >
                    {category.name}
                  </Link>
                ))}
              </nav>
            ) : null}
          </section>
        ) : null}
        <h2 className="student-section-title">{contentTitle}</h2>
        {terms.length > 0 ? (
          <section className="study-list">
            {terms.map((term) => {
              const meaning = term.meanings[0];
              const learningStatus = progressByTermId.get(term.id);
              return (
                <article className="study-card" key={term.id}>
                  <div className="study-card-header">
                    <div className="study-card-main">
                      <h2>
                        <span>{term.text}</span>
                        {term.termType === "word" && term.phoneticSymbol ? <small>{term.phoneticSymbol}</small> : null}
                      </h2>
                      <p>{formatStudyType(term.termType, meaning?.partOfSpeech)}</p>
                      {learningStatus ? <p className={`study-status-label ${learningStatus}`}>{formatLearningStatus(learningStatus)}</p> : null}
                      {term.termType === "word" ? (
                        <audio aria-label={`${term.text} 发音`} controls preload="none" src={buildPronunciationAudioUrl(term.text)} />
                      ) : null}
                    </div>
                    <div className="study-card-actions">
                      <LearningStatusForm
                        activeStatus={learningStatus}
                        categoryId={params.categoryId}
                        groupId={params.groupId}
                        status="mastered"
                        termId={term.id}
                        unitId={params.unitId}
                      />
                      <LearningStatusForm
                        activeStatus={learningStatus}
                        categoryId={params.categoryId}
                        groupId={params.groupId}
                        status="unmastered"
                        termId={term.id}
                        unitId={params.unitId}
                      />
                    </div>
                  </div>
                  <details className="study-details">
                    <summary className="study-toggle">
                      <span className="study-toggle-open">展开</span>
                      <span className="study-toggle-close">收起</span>
                    </summary>
                    <div className="study-detail-body">
                      {getMeaningLines(term.termType, term.meanings, term.text).map((line, index) => (
                        <p key={`${term.id}-meaning-${index}`}>{line}</p>
                      ))}
                      {getVisibleExampleSentences(term.termType, term.text, term.meanings).map((sentence, index) => (
                        <p key={`${term.id}-example-${index}`}>{sentence}</p>
                      ))}
                      {getVisibleExplanationLines(term.meanings).map((explanation, index) => (
                        <p key={`${term.id}-explanation-${index}`}>{explanation}</p>
                      ))}
                      {term.meanings.map((item, index) =>
                        shouldShowUsageContext(item) ? <p key={`${term.id}-usage-${index}`}>{item.usageContext}</p> : null,
                      )}
                    </div>
                  </details>
                </article>
              );
            })}
          </section>
        ) : (
          <article className="study-card">
            <h2>暂无词条</h2>
            <p>请先到老师端导入学习内容。</p>
          </article>
        )}
      </section>
      <nav className="bottom-nav" aria-label="学生底部导航">
        <Link href="/learn">学习</Link>
        <Link href="/self-test">自测</Link>
        <Link href="/exam">考试</Link>
        <Link href="/results">结果</Link>
      </nav>
    </main>
  );
}

function formatStudyType(termType: string, partOfSpeech?: string | null) {
  if (termType === "phrase") return "固定搭配";
  if (termType === "sentence") return "句型";
  return `${partOfSpeech ?? "word"} · 🔊`;
}

function formatLearningStatus(status: LearningStatus) {
  return status === "mastered" ? "已掌握" : "未掌握";
}

function LearningStatusForm({
  activeStatus,
  categoryId,
  groupId,
  status,
  termId,
  unitId,
}: {
  activeStatus?: LearningStatus;
  categoryId?: string;
  groupId?: string;
  status: LearningStatus;
  termId: string;
  unitId?: string;
}) {
  const isActive = activeStatus === status;
  return (
    <form action={updateLearningProgressAction} className="study-status-form">
      <input name="termId" type="hidden" value={termId} />
      <input name="status" type="hidden" value={status} />
      {groupId ? <input name="groupId" type="hidden" value={groupId} /> : null}
      {unitId ? <input name="unitId" type="hidden" value={unitId} /> : null}
      {categoryId ? <input name="categoryId" type="hidden" value={categoryId} /> : null}
      <button className={`study-status-button ${status} ${isActive ? "active" : ""}`} type="submit" aria-pressed={isActive}>
        <span aria-hidden="true">{status === "mastered" ? "✓" : "!"}</span>
        {status === "mastered" ? "掌握" : "未掌握"}
      </button>
    </form>
  );
}
