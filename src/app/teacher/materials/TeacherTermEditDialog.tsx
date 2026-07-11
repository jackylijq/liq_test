"use client";

import { useRef } from "react";
import { updateTeacherTermAction } from "./edit-actions";

type EditableMeaning = {
  id: string;
  partOfSpeech: string | null;
  chineseMeaning: string;
  exampleSentence: string | null;
  explanation: string | null;
  usageContext: string | null;
};

type CategoryOption = {
  id: string;
  label: string;
};

type TeacherTermEditDialogProps = {
  term: {
    id: string;
    text: string;
    termType: string;
    phoneticSymbol: string | null;
    pronunciationUrl: string | null;
    meanings: EditableMeaning[];
    groups: Array<{ groupId: string }>;
  };
  categoryOptions: CategoryOption[];
  rootGroupId: string;
  returnHref: string;
};

export function TeacherTermEditDialog({ term, categoryOptions, rootGroupId, returnHref }: TeacherTermEditDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const selectedGroupId = term.groups.find((group) => categoryOptions.some((option) => option.id === group.groupId))?.groupId ?? rootGroupId;
  const meaningRows = [...term.meanings, createBlankMeaning()];

  return (
    <>
      <button
        aria-label={`编辑 ${term.text}`}
        className="teacher-term-edit-button"
        onClick={() => dialogRef.current?.showModal()}
        title="编辑"
        type="button"
      >
        <PencilIcon />
      </button>
      <dialog className="teacher-term-edit-dialog" ref={dialogRef}>
        <form action={updateTeacherTermAction} className="teacher-term-edit-form">
          <input name="termId" type="hidden" value={term.id} />
          <input name="rootGroupId" type="hidden" value={rootGroupId} />
          <input name="returnHref" type="hidden" value={returnHref} />

          <header className="teacher-term-edit-header">
            <div>
              <p className="eyebrow">编辑词条</p>
              <h2>{term.text}</h2>
            </div>
            <button aria-label="关闭" onClick={() => dialogRef.current?.close()} type="button">
              <XIcon />
            </button>
          </header>

          <section className="teacher-term-edit-grid">
            <label>
              英文
              <input name="text" required defaultValue={term.text} />
            </label>
            <label>
              类型
              <select defaultValue={term.termType} name="termType">
                <option value="word">单词</option>
                <option value="phrase">短语</option>
                <option value="sentence">句子</option>
              </select>
            </label>
            <label>
              音标
              <input name="phoneticSymbol" defaultValue={term.phoneticSymbol ?? ""} />
            </label>
            <label>
              发音链接
              <input name="pronunciationUrl" defaultValue={term.pronunciationUrl ?? ""} />
            </label>
            <label className="teacher-term-edit-wide">
              分类
              <select defaultValue={selectedGroupId} name="selectedGroupId">
                {categoryOptions.map((option) => (
                  <option key={option.id} value={option.id}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
          </section>

          <section className="teacher-term-edit-meanings" aria-label="释义编辑">
            {meaningRows.map((meaning, index) => (
              <fieldset key={meaning.id || `new-${index}`}>
                <legend>{meaning.id ? `释义 ${index + 1}` : "新增释义"}</legend>
                <input name="meaningId" type="hidden" value={meaning.id} />
                <label>
                  词性
                  <input name={`meaning-${index}-partOfSpeech`} defaultValue={meaning.partOfSpeech ?? ""} />
                </label>
                <label>
                  中文
                  <textarea name={`meaning-${index}-chineseMeaning`} defaultValue={meaning.chineseMeaning} rows={2} />
                </label>
                <label>
                  示例句子
                  <textarea name={`meaning-${index}-exampleSentence`} defaultValue={meaning.exampleSentence ?? ""} rows={2} />
                </label>
                <label>
                  解析
                  <textarea name={`meaning-${index}-explanation`} defaultValue={meaning.explanation ?? ""} rows={3} />
                </label>
                <label>
                  常用场景
                  <textarea name={`meaning-${index}-usageContext`} defaultValue={meaning.usageContext ?? ""} rows={2} />
                </label>
              </fieldset>
            ))}
          </section>

          <footer className="teacher-term-edit-actions">
            <button onClick={() => dialogRef.current?.close()} type="button">
              取消
            </button>
            <button type="submit">保存</button>
          </footer>
        </form>
      </dialog>
    </>
  );
}

function createBlankMeaning(): EditableMeaning {
  return {
    id: "",
    partOfSpeech: "",
    chineseMeaning: "",
    exampleSentence: "",
    explanation: "",
    usageContext: "",
  };
}

function PencilIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24">
      <path d="M12 20h9" />
      <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z" />
    </svg>
  );
}

function XIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24">
      <path d="M18 6 6 18" />
      <path d="m6 6 12 12" />
    </svg>
  );
}
