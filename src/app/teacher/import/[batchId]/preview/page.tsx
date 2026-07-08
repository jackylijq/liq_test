import type { TermDraft } from "@/lib/types";
import { getPreviewRows } from "../../actions";

export default async function ImportPreviewPage({ params }: { params: Promise<{ batchId: string }> }) {
  const { batchId } = await params;
  const rows = (await getPreviewRows(batchId)) as TermDraft[];

  return (
    <main className="page">
      <h1>导入预览</h1>
      <div className="table">
        {rows.map((row) => (
          <article className="row" key={row.text}>
            <strong>{row.text}</strong>
            <span>{row.termType === "phrase" ? "短语" : "单词"}</span>
            <span>{row.meanings[0]?.chineseMeaning}</span>
          </article>
        ))}
      </div>
    </main>
  );
}
