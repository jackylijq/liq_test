import { parseImportAction } from "./actions";

export default function TeacherImportPage() {
  return (
    <main className="page">
      <h1>老师导入</h1>
      <form action={parseImportAction} className="panel">
        <label htmlFor="file">上传 PDF / Word 文件</label>
        <input
          id="file"
          name="file"
          type="file"
          accept=".pdf,.docx,.txt,text/plain,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
        />
        <label htmlFor="content">导入内容</label>
        <textarea id="content" name="content" rows={10} />
        <button type="submit">解析内容</button>
      </form>
    </main>
  );
}
