import Link from "next/link";
import { updateLearningProgressAction } from "./actions";
import { StudentMaterialsContent } from "./StudentMaterialsContent";
import { prisma } from "@/lib/db";
import { DEFAULT_STUDENT_USER_KEY, normalizeLearningProgressFilter, type LearningStatus } from "@/lib/learning/progress";
import { normalizeStudentMenu, studentMenus } from "@/lib/student/navigation";
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
  searchParams: Promise<{ menu?: string; tab?: string; groupId?: string; unitId?: string; categoryId?: string; progressStatus?: string }>;
};

export default async function LearnPage({ searchParams }: LearnPageProps) {
  const params = await searchParams;
  const activeMenu = normalizeStudentMenu(params.menu);
  const progressFilter = normalizeLearningProgressFilter(params.progressStatus);
  const groups = await getTeacherGroups();
  const selectedGroup = params.groupId ? selectTeacherGroup(groups, params.groupId) : null;
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
  const visibleTerms = progressFilter ? terms.filter((term) => matchesProgressFilter(progressByTermId.get(term.id), progressFilter)) : terms;
  const contentTitle = selectedCategory?.name ?? selectedUnit?.name ?? selectedGroup?.name ?? "学习";

  return (
    <main className="student-layout learn-scroll">
      <aside className="group-sidebar">
        <h1>学生工作台</h1>
        <nav className="student-menu-links" aria-label="学生菜单">
          {studentMenus.map((menu) => (
            <Link className={menu.id === activeMenu ? "active" : ""} href={menu.href} key={menu.id}>
              {menu.label}
            </Link>
          ))}
        </nav>
      </aside>
      <section className="student-content">
        {params.groupId ? (
          <>
            <header className="student-workbench-header">
              <div>
                <p className="eyebrow">单词学习</p>
                <h1>{selectedGroup?.name ?? "学习"}</h1>
              </div>
              <Link className="secondary-link" href="/learn?menu=word-learning">
                返回资料
              </Link>
            </header>
            {selectedGroup && outline.length > 0 ? (
              <section className="student-outline-panel" aria-label="学习内容筛选">
                <nav className="teacher-unit-tabs" aria-label="学习单元筛选">
                  {outline.map((unit) => (
                    <Link className={unit.id === selectedUnit?.id ? "active" : ""} href={buildLearnHref({ groupId: selectedGroup.id, unitId: unit.id, progressStatus: progressFilter })} key={unit.id}>
                      {unit.name}
                    </Link>
                  ))}
                </nav>
                {selectedUnit ? (
                  <nav className="teacher-filter-tabs" aria-label="学习小类筛选">
                    {selectedUnit.categories.map((category) => (
                      <Link className={category.id === selectedCategory?.id ? "active" : ""} href={buildLearnHref({ groupId: selectedGroup.id, unitId: selectedUnit.id, categoryId: category.id, progressStatus: progressFilter })} key={category.id}>
                        {category.name}
                      </Link>
                    ))}
                  </nav>
                ) : null}
              </section>
            ) : null}
            <h2 className="student-section-title">
              {contentTitle}
              {progressFilter ? <span>{formatProgressFilter(progressFilter)}</span> : null}
            </h2>
            {visibleTerms.length > 0 ? (
              <section className="study-list">
                {visibleTerms.map((term) => {
                  const meaning = term.meanings[0];
                  const learningStatus = progressByTermId.get(term.id);
                  const detailLines = getStudyDetailLines(term);
                  return (
                    <article className="study-card" key={term.id}>
                      <div className="study-card-main">
                        <h2>
                          <span>{term.text}</span>
                          {term.termType === "word" && term.phoneticSymbol ? <small>{term.phoneticSymbol}</small> : null}
                        </h2>
                        <p className="study-type-label">{formatStudyType(term.termType, meaning?.partOfSpeech)}</p>
                        {learningStatus ? <p className={`study-status-label ${learningStatus}`}>{formatLearningStatus(learningStatus)}</p> : null}
                        {term.termType === "word" ? (
                          <audio aria-label={`${term.text} 发音`} controls preload="none" src={buildPronunciationAudioUrl(term.text)} />
                        ) : null}
                      </div>
                      <details className="study-details">
                        <summary className="study-icon-button study-toggle-button" title="展开/收起内容" aria-label="展开/收起内容">
                          <span className="study-toggle-open">
                            <EyeIcon />
                          </span>
                          <span className="study-toggle-close">
                            <EyeOffIcon />
                          </span>
                        </summary>
                        <div className="study-detail-body">
                          {detailLines.map((line, index) => (
                            <p key={`${term.id}-detail-${index}`}>{line}</p>
                          ))}
                        </div>
                      </details>
                      <LearningStatusForm
                        activeStatus={learningStatus}
                        categoryId={params.categoryId}
                        groupId={params.groupId}
                        progressStatus={progressFilter}
                        status="mastered"
                        termId={term.id}
                        unitId={params.unitId}
                      />
                      <LearningStatusForm
                        activeStatus={learningStatus}
                        categoryId={params.categoryId}
                        groupId={params.groupId}
                        progressStatus={progressFilter}
                        status="unmastered"
                        termId={term.id}
                        unitId={params.unitId}
                      />
                    </article>
                  );
                })}
              </section>
            ) : (
              <article className="study-card">
                <h2>暂无词条</h2>
                <p>{terms.length > 0 ? "当前学习状态下暂无内容。" : "请先到老师端导入学习内容。"}</p>
              </article>
            )}
          </>
        ) : (
          <StudentMaterialsContent tab={params.tab} />
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

function formatProgressFilter(status: "mastered" | "unmastered" | "unlearned") {
  if (status === "mastered") return "掌握";
  if (status === "unmastered") return "未掌握";
  return "未学习";
}

function matchesProgressFilter(status: LearningStatus | undefined, filter: "mastered" | "unmastered" | "unlearned") {
  if (filter === "unlearned") return !status;
  return status === filter;
}

function buildLearnHref({
  groupId,
  unitId,
  categoryId,
  progressStatus,
}: {
  groupId?: string;
  unitId?: string;
  categoryId?: string;
  progressStatus?: string;
}) {
  const searchParams = new URLSearchParams({ menu: "word-learning" });
  if (groupId) searchParams.set("groupId", groupId);
  if (unitId) searchParams.set("unitId", unitId);
  if (categoryId) searchParams.set("categoryId", categoryId);
  if (progressStatus) searchParams.set("progressStatus", progressStatus);
  return `/learn?${searchParams.toString()}`;
}

function getStudyDetailLines(term: Awaited<ReturnType<typeof getTeacherGroupTerms>>[number]) {
  return [
    ...getMeaningLines(term.termType, term.meanings, term.text),
    ...getVisibleExampleSentences(term.termType, term.text, term.meanings),
    ...getVisibleExplanationLines(term.meanings),
    ...term.meanings.flatMap((item) => (shouldShowUsageContext(item) && item.usageContext ? [item.usageContext] : [])),
  ];
}

function LearningStatusForm({
  activeStatus,
  categoryId,
  groupId,
  progressStatus,
  status,
  termId,
  unitId,
}: {
  activeStatus?: LearningStatus;
  categoryId?: string;
  groupId?: string;
  progressStatus?: string;
  status: LearningStatus;
  termId: string;
  unitId?: string;
}) {
  const isActive = activeStatus === status;
  return (
    <form action={updateLearningProgressAction} className={`study-status-form ${status}`}>
      <input name="termId" type="hidden" value={termId} />
      <input name="status" type="hidden" value={status} />
      {groupId ? <input name="groupId" type="hidden" value={groupId} /> : null}
      {unitId ? <input name="unitId" type="hidden" value={unitId} /> : null}
      {categoryId ? <input name="categoryId" type="hidden" value={categoryId} /> : null}
      {progressStatus ? <input name="progressStatus" type="hidden" value={progressStatus} /> : null}
      <button
        aria-label={status === "mastered" ? "标记为掌握" : "标记为未掌握"}
        aria-pressed={isActive}
        className={`study-icon-button study-status-button ${status} ${isActive ? "active" : ""}`}
        title={status === "mastered" ? "掌握" : "未掌握"}
        type="submit"
      >
        {status === "mastered" ? <CheckIcon /> : <XIcon />}
      </button>
    </form>
  );
}

function EyeIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24">
      <path d="M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6S2 12 2 12Z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

function EyeOffIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24">
      <path d="m3 3 18 18" />
      <path d="M10.6 10.6a2 2 0 0 0 2.8 2.8" />
      <path d="M9.9 5.2A10.7 10.7 0 0 1 12 5c6.5 0 10 7 10 7a15.6 15.6 0 0 1-3.1 4.1" />
      <path d="M6.6 6.6A15.2 15.2 0 0 0 2 12s3.5 7 10 7a10.8 10.8 0 0 0 4.5-.9" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24">
      <path d="m5 12 4 4L19 6" />
    </svg>
  );
}

function XIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24">
      <path d="M18 6 6 18" />
      <path d="m6 6 12 12" />
    </svg>
  );
}
