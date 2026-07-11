import Link from "next/link";
import { enrichTeacherTermsAction } from "./actions";
import {
  getTeacherGroups,
  getTeacherGroupScope,
  getTeacherGroupTerms,
  selectTeacherGroup,
  sortTeacherTermsForEnrichment,
} from "@/lib/teacher/groups";
import { getMeaningLines } from "@/lib/terms/display";

type TeacherEnrichPageProps = {
  searchParams: Promise<{ groupId?: string; error?: string }>;
};

export default async function TeacherEnrichPage({ searchParams }: TeacherEnrichPageProps) {
  const params = await searchParams;
  const groups = await getTeacherGroups();
  const selectedGroup = selectTeacherGroup(groups, params.groupId);
  const requestedScope = params.groupId ? await getTeacherGroupScope(params.groupId) : null;
  const selectedScope = requestedScope ?? (selectedGroup ? await getTeacherGroupScope(selectedGroup.id) : null);
  const terms = selectedScope ? sortTeacherTermsForEnrichment(await getTeacherGroupTerms(selectedScope.id)) : [];

  return (
    <main className="page">
      <section className="panel teacher-enrich-panel">
        <div className="import-page-header">
          <div>
            <p className="eyebrow">补齐分类</p>
            <h1>{selectedScope?.displayName ?? "暂无分类"}</h1>
          </div>
          <Link href={selectedScope?.teacherHref ?? "/teacher/materials"}>返回资料</Link>
        </div>

        {params.error === "empty-selection" ? <p className="form-error">请至少勾选一条需要补齐的内容。</p> : null}

        {selectedScope ? (
          <form action={enrichTeacherTermsAction} className="enrich-form">
            <input type="hidden" name="targetGroupId" value={selectedScope.id} />
            <div className="enrich-actions">
              <button name="mode" type="submit" value="selected">
                确认补齐选中
              </button>
              <button name="mode" type="submit" value="all">
                补齐全部
              </button>
            </div>

            {terms.length === 0 ? (
              <p className="empty-state">当前分类暂无内容。</p>
            ) : (
              <div className="enrich-list">
                {terms.map((term) => {
                  const meaningLines = getMeaningLines(term.termType, term.meanings, term.text);
                  return (
                    <label className="enrich-row" key={term.id}>
                      <input name="termId" type="checkbox" value={term.id} />
                      <span>
                        <strong>{term.text}</strong>
                        <small>
                          {term.termType === "word" ? "单词" : term.termType === "phrase" ? "短语" : "句子"}
                          {term.termType === "word" && term.phoneticSymbol ? ` · ${term.phoneticSymbol}` : ""}
                        </small>
                        <em>{meaningLines.length ? meaningLines.join("；") : "待补齐中文意思"}</em>
                      </span>
                    </label>
                  );
                })}
              </div>
            )}
          </form>
        ) : (
          <p className="empty-state">暂无分类，请先运行种子数据。</p>
        )}
      </section>
    </main>
  );
}
