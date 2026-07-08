import Link from "next/link";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function LearnPage() {
  const terms = await prisma.term.findMany({
    include: { meanings: true },
    orderBy: { createdAt: "desc" },
    take: 1,
  });
  const term = terms[0];
  const meaning = term?.meanings[0];

  return (
    <main className="student-layout">
      <aside className="group-sidebar">1年级上册</aside>
      <section className="student-content">
        <h1>学习</h1>
        {term && meaning ? (
          <article className="study-card">
            <h2>{term.text}</h2>
            <p>{term.termType === "phrase" ? "固定搭配" : `${meaning.partOfSpeech ?? "word"} · 🔊`}</p>
            <p>{meaning.chineseMeaning}</p>
            <p>{meaning.exampleSentence}</p>
          </article>
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
