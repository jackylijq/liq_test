import Link from "next/link";
import { toggleTeacherMaterialFavoriteAction } from "./actions";
import {
  filterTeacherMaterialGroups,
  getTeacherMaterialCards,
  normalizeTeacherMaterialTab,
  type MaterialTab,
} from "@/lib/teacher/materials";

type TeacherMaterialsPageProps = {
  searchParams: Promise<{ tab?: string }>;
};

const materialTabs: Array<{ id: MaterialTab; label: string }> = [
  { id: "favorite", label: "收藏" },
  { id: "all", label: "全部" },
  { id: "primary", label: "小学" },
  { id: "junior", label: "初中" },
  { id: "other", label: "其他" },
];

export default async function TeacherMaterialsPage({ searchParams }: TeacherMaterialsPageProps) {
  const params = await searchParams;
  const activeTab = normalizeTeacherMaterialTab(params.tab);
  const cards = await getTeacherMaterialCards();
  const visibleCards = filterTeacherMaterialGroups(cards, activeTab);

  return (
    <main className="teacher-material-page">
      <header className="teacher-material-header">
        <div>
          <p className="eyebrow">老师工作台</p>
          <h1>单词资料</h1>
        </div>
        <Link className="secondary-link" href="/">
          返回首页
        </Link>
      </header>

      <nav className="teacher-material-tabs" aria-label="单词资料分类">
        {materialTabs.map((tab) => (
          <Link className={tab.id === activeTab ? "active" : ""} href={`/teacher/materials?tab=${tab.id}`} key={tab.id}>
            {tab.label}
          </Link>
        ))}
      </nav>

      {visibleCards.length > 0 ? (
        <section className="teacher-material-grid">
          {visibleCards.map((card) => (
            <article className="teacher-material-card" key={card.id}>
              <form action={toggleTeacherMaterialFavoriteAction} className="teacher-material-favorite-form">
                <input name="groupId" type="hidden" value={card.id} />
                <input name="tab" type="hidden" value={activeTab} />
                <button aria-label={card.isFavorite ? "取消收藏" : "收藏"} title={card.isFavorite ? "取消收藏" : "收藏"} type="submit">
                  {card.isFavorite ? "★" : "☆"}
                </button>
              </form>
              <Link className="teacher-material-cover-link" href={`/teacher/materials/${card.id}`}>
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
    </main>
  );
}
