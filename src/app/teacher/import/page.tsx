import { parsePasteAction } from "./actions";

export default function TeacherImportPage() {
  return (
    <main className="page">
      <h1>老师导入</h1>
      <form action={parsePasteAction} className="panel">
        <label htmlFor="content">导入内容</label>
        <textarea id="content" name="content" rows={10} />
        <button type="submit">解析内容</button>
      </form>
    </main>
  );
}
