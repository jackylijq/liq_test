import Link from "next/link";

export default function LearnPage() {
  return (
    <main className="student-layout">
      <aside className="group-sidebar">1年级上册</aside>
      <section className="student-content">
        <h1>学习</h1>
        <article className="study-card">
          <h2>apple</h2>
          <p>/ˈæpəl/ · noun · 🔊</p>
          <p>苹果</p>
          <p>I eat an apple after lunch.</p>
        </article>
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
