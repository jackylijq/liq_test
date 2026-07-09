import Link from "next/link";
import type { TermDraft } from "@/lib/types";
import { confirmImportAction, getImportBatch, getPreviewRows } from "../../actions";

export default async function ImportPreviewPage({ params }: { params: Promise<{ batchId: string }> }) {
  const { batchId } = await params;
  const batch = await getImportBatch(batchId);
  const rows = (await getPreviewRows(batchId)) as TermDraft[];

  return (
    <main className="page">
      <h1>导入预览</h1>
      {batch ? <p>目标分类：{batch.group.name}</p> : null}
      {batch?.sourceType === "supplement" ? <p>当前为补充匹配模式：只会更新已存在的英文词条，不会新增 PDF/Word 中的英文。</p> : null}
      <div className="table">
        {rows.map((row, index) => (
          <article className="row" key={`${row.text}-${index}`}>
            <strong>{row.text}</strong>
            <span>{row.termType === "phrase" ? "短语" : "单词"}</span>
            <span>{row.meanings[0]?.chineseMeaning}</span>
          </article>
        ))}
      </div>
      <form action={confirmImportAction} className="confirm-bar">
        <input type="hidden" name="batchId" value={batchId} />
        <button type="submit">确认导入</button>
      </form>
      {batch ? <Link href={`/teacher?groupId=${batch.targetGroupId}`}>返回当前分类</Link> : null}
    </main>
  );
}
