export default async function ResultDetailPage({ params }: { params: Promise<{ sessionId: string }> }) {
  const { sessionId } = await params;
  return (
    <main className="student-layout exam-scroll">
      <aside className="group-sidebar">筛选：全部 / 正确 / 错误</aside>
      <section className="student-content">
        <h1>考试详情</h1>
        <p>结果编号：{sessionId}</p>
      </section>
    </main>
  );
}
