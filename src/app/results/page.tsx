export default function ResultsPage() {
  return (
    <main className="student-layout exam-scroll">
      <aside className="group-sidebar">历史考试</aside>
      <section className="student-content">
        <h1>考试结果</h1>
        <p>暂无考试记录。</p>
      </section>
      <nav className="bottom-nav" aria-label="学生底部导航">
        <a href="/learn">学习</a>
        <a href="/self-test">自测</a>
        <a href="/exam">考试</a>
        <a href="/results">结果</a>
      </nav>
    </main>
  );
}
