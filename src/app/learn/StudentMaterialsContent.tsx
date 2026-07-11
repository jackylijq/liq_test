import Link from "next/link";
import { clearLearningProgressAction } from "./actions";
import { prisma } from "@/lib/db";
import { DEFAULT_STUDENT_USER_KEY, summarizeLearningProgress } from "@/lib/learning/progress";
import { buildStudentMaterialHref } from "@/lib/student/navigation";
import {
  filterTeacherMaterialGroups,
  getTeacherMaterialCards,
  normalizeTeacherMaterialTab,
  type MaterialTab,
} from "@/lib/teacher/materials";

type StudentMaterialsContentProps = {
  tab?: string;
};

const materialTabs: Array<{ id: MaterialTab; label: string }> = [
  { id: "favorite", label: "收藏" },
  { id: "all", label: "全部" },
  { id: "primary", label: "小学" },
  { id: "junior", label: "初中" },
  { id: "other", label: "其他" },
];

export async function StudentMaterialsContent({ tab }: StudentMaterialsContentProps) {
  const activeTab = normalizeTeacherMaterialTab(tab);
  const cards = await getTeacherMaterialCards();
  const visibleCards = filterTeacherMaterialGroups(cards, activeTab);
  const progressRows = await prisma.learningProgress.findMany({
    where: { userKey: DEFAULT_STUDENT_USER_KEY },
    select: { termId: true, status: true },
  });
  const progressByTermId = new Map(progressRows.map((row) => [row.termId, row.status]));

  return (
    <>
      <header className="teacher-material-header">
        <div>
          <p className="eyebrow">学生入口</p>
          <h1>单词学习</h1>
        </div>
        <form action={clearLearningProgressAction}>
          <button className="secondary-link" type="submit">
            清空
          </button>
        </form>
      </header>

      <nav className="teacher-material-tabs" aria-label="单词学习资料分类">
        {materialTabs.map((item) => (
          <Link className={item.id === activeTab ? "active" : ""} href={buildStudentMaterialHref({ tab: item.id })} key={item.id}>
            {item.label}
          </Link>
        ))}
      </nav>

      {visibleCards.length > 0 ? (
        <section className="teacher-material-grid">
          {visibleCards.map((card) => {
            const progress = summarizeLearningProgress({
              totalCount: card.terms.length,
              statuses: card.terms.map((term) => progressByTermId.get(term.id)),
            });
            return (
              <article className="teacher-material-card" key={card.id}>
                <Link className="teacher-material-cover-link" href={buildStudentMaterialHref({ groupId: card.id })}>
                  <img alt={`${card.name} ${card.label}`} src={card.imageUrl} />
                </Link>
                <div className="teacher-material-card-body">
                  <strong>{card.name}</strong>
                  <span>{card.label}</span>
                  <div className="teacher-material-card-stats student-progress-card-stats">
                    <Link href={buildStudentMaterialHref({ groupId: card.id, progressStatus: "mastered" })}>掌握 {progress.masteredCount}</Link>
                    <Link href={buildStudentMaterialHref({ groupId: card.id, progressStatus: "unmastered" })}>
                      未掌握 {progress.unmasteredCount}
                    </Link>
                    <Link href={buildStudentMaterialHref({ groupId: card.id, progressStatus: "unlearned" })}>
                      未学习 {progress.unlearnedCount}
                    </Link>
                  </div>
                </div>
              </article>
            );
          })}
        </section>
      ) : (
        <section className="empty-state">当前分类暂无资料。</section>
      )}
    </>
  );
}
