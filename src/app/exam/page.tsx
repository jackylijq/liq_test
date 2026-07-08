export default function ExamPage() {
  return (
    <main className="student-layout exam-scroll">
      <aside className="group-sidebar">多年级选择</aside>
      <section className="student-content">
        <h1>考试</h1>
        <p>随机生成 100 道选择题。</p>
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
