import Link from "next/link";
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

  return (
    <>
      <header className="teacher-material-header">
        <div>
          <p className="eyebrow">学生入口</p>
          <h1>单词学习</h1>
        </div>
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
          {visibleCards.map((card) => (
            <article className="teacher-material-card" key={card.id}>
              <Link className="teacher-material-cover-link" href={buildStudentMaterialHref({ groupId: card.id })}>
                <img alt={`${card.name} ${card.label}`} src={card.imageUrl} />
              </Link>
              <div className="teacher-material-card-body">
                <strong>{card.name}</strong>
                <span>{card.label}</span>
                <div className="teacher-material-card-stats">
                  <span>单词 {card.summary.wordCount}</span>
                  <span>短语 {card.summary.phraseCount}</span>
                  <span>句子 {card.summary.sentenceCount}</span>
                  <span>待补全 {card.summary.missingFieldCount}</span>
                </div>
              </div>
            </article>
          ))}
        </section>
      ) : (
        <section className="empty-state">当前分类暂无资料。</section>
      )}
    </>
  );
}
