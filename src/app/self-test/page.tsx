export default function SelfTestPage() {
  return (
    <main className="student-layout">
      <aside className="group-sidebar">1年级上册</aside>
      <section className="student-content">
        <h1>自测</h1>
        <article className="study-card">
          <h2>apple</h2>
          <button>苹果</button>
          <button>香蕉</button>
          <button>橙子</button>
          <button>梨</button>
        </article>
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
