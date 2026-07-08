import { prisma } from "@/lib/db";

export default async function TeacherLibraryPage() {
  const terms = await prisma.term.findMany({
    include: { meanings: true, groups: { include: { group: true } } },
    orderBy: { createdAt: "desc" },
  });

  return (
    <main className="page">
      <h1>词库管理</h1>
      <div className="table">
        {terms.length === 0 ? (
          <p>暂无词条。</p>
        ) : (
          terms.map((term) => (
            <article className="row" key={term.id}>
              <strong>{term.text}</strong>
              <span>{term.termType === "phrase" ? "短语" : "单词"}</span>
              <span>{term.meanings.map((meaning) => meaning.chineseMeaning).join("；")}</span>
            </article>
          ))
        )}
      </div>
    </main>
  );
}
