import Link from "next/link";

export default function HomePage() {
  return (
    <main className="entry-page">
      <section className="entry-panel">
        <h1>English Study</h1>
        <div className="entry-actions">
          <Link href="/teacher">老师入口</Link>
          <Link href="/learn">学生入口</Link>
        </div>
      </section>
    </main>
  );
}
