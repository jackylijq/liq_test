# Teacher Category Workbench Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a teacher workbench at `/teacher` where teachers choose a default grade category, import files into that category, and review category content split into words and phrases.

**Architecture:** Keep the existing Prisma schema and import preview flow. Add focused teacher data helpers for group selection and group-scoped term queries, then update the teacher UI and import actions to pass `targetGroupId` explicitly through `FormData` and redirects.

**Tech Stack:** Next.js 15 App Router, React 19 server components, Prisma SQLite, TypeScript, Vitest, Playwright.

---

## File Structure

- Modify `src/app/page.tsx`: change teacher entry link from `/teacher/import` to `/teacher`.
- Create `src/app/teacher/page.tsx`: teacher workbench server page with category outline, selected category summary, upload form, and word/phrase lists.
- Modify `src/app/teacher/import/page.tsx`: keep as a compatibility redirect or lightweight wrapper to `/teacher`.
- Modify `src/app/teacher/import/actions.ts`: read `targetGroupId`, validate non-empty input, create batches for the selected category, and redirect back to the selected category after confirmation.
- Modify `src/app/teacher/import/[batchId]/preview/page.tsx`: include selected category context and preserve the existing preview.
- Create `src/lib/teacher/groups.ts`: default group lookup and teacher workbench data queries.
- Modify `src/lib/types.ts`: add `"web_lookup"` to `FieldSource` so future Baidu/search provider output has an explicit source label.
- Modify `tests/e2e/teacher-import.spec.ts`: cover `/teacher`, category-scoped import, and word/phrase tabs.
- Modify `tests/e2e/full-flow.spec.ts`: use `/teacher` instead of `/teacher/import`.
- Modify `tests/unit/enrichment.test.ts`: strengthen phrase enrichment expectations.
- Create `tests/unit/teacher-groups.test.ts`: unit coverage for selected group fallback and grouped content shaping.

---

### Task 1: Teacher Group Data Helpers

**Files:**
- Create: `src/lib/teacher/groups.ts`
- Create: `tests/unit/teacher-groups.test.ts`

- [ ] **Step 1: Write the failing tests**

Create `tests/unit/teacher-groups.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { selectTeacherGroup, summarizeTeacherTerms } from "@/lib/teacher/groups";

describe("selectTeacherGroup", () => {
  const groups = [
    { id: "g1", name: "1年级上册", sortOrder: 1 },
    { id: "g2", name: "1年级下册", sortOrder: 2 },
  ];

  it("uses the selected group when it exists", () => {
    expect(selectTeacherGroup(groups, "g2")?.id).toBe("g2");
  });

  it("falls back to the first ordered group", () => {
    expect(selectTeacherGroup(groups, "missing")?.id).toBe("g1");
  });
});

describe("summarizeTeacherTerms", () => {
  it("splits word and phrase counts and detects missing fields", () => {
    const summary = summarizeTeacherTerms([
      {
        termType: "word",
        meanings: [{ chineseMeaning: "苹果", exampleSentence: null, usageContext: null }],
      },
      {
        termType: "phrase",
        meanings: [{ chineseMeaning: "", exampleSentence: "Look at me.", usageContext: "" }],
      },
    ]);

    expect(summary).toEqual({
      wordCount: 1,
      phraseCount: 1,
      missingFieldCount: 3,
    });
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test -- tests/unit/teacher-groups.test.ts`

Expected: FAIL because `src/lib/teacher/groups.ts` does not exist.

- [ ] **Step 3: Implement the helper module**

Create `src/lib/teacher/groups.ts`:

```ts
import { prisma } from "@/lib/db";

export type TeacherGroupOption = {
  id: string;
  name: string;
  sortOrder: number;
};

export type TeacherTermForSummary = {
  termType: string;
  meanings: Array<{
    chineseMeaning: string | null;
    exampleSentence: string | null;
    usageContext: string | null;
  }>;
};

export function selectTeacherGroup<T extends { id: string }>(groups: T[], selectedGroupId?: string | null): T | null {
  if (groups.length === 0) return null;
  return groups.find((group) => group.id === selectedGroupId) ?? groups[0];
}

export function summarizeTeacherTerms(terms: TeacherTermForSummary[]) {
  return terms.reduce(
    (summary, term) => {
      if (term.termType === "phrase") {
        summary.phraseCount += 1;
      } else {
        summary.wordCount += 1;
      }

      for (const meaning of term.meanings) {
        if (!meaning.chineseMeaning?.trim()) summary.missingFieldCount += 1;
        if (!meaning.exampleSentence?.trim()) summary.missingFieldCount += 1;
        if (term.termType === "phrase" && !meaning.usageContext?.trim()) summary.missingFieldCount += 1;
      }

      return summary;
    },
    { wordCount: 0, phraseCount: 0, missingFieldCount: 0 },
  );
}

export async function getTeacherGroups(): Promise<TeacherGroupOption[]> {
  return prisma.group.findMany({
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    select: { id: true, name: true, sortOrder: true },
  });
}

export async function getTeacherGroupTerms(groupId: string) {
  return prisma.term.findMany({
    where: { groups: { some: { groupId } } },
    include: { meanings: true },
    orderBy: [{ termType: "asc" }, { text: "asc" }],
  });
}
```

- [ ] **Step 4: Run helper tests**

Run: `npm test -- tests/unit/teacher-groups.test.ts`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/teacher/groups.ts tests/unit/teacher-groups.test.ts
git commit -m "feat: add teacher group helpers"
```

---

### Task 2: Category-Scoped Import Actions

**Files:**
- Modify: `src/app/teacher/import/actions.ts`
- Modify: `src/lib/types.ts`
- Modify: `tests/unit/enrichment.test.ts`

- [ ] **Step 1: Strengthen phrase enrichment test**

In `tests/unit/enrichment.test.ts`, update the phrase test to assert existing imported fields are preserved and missing fields are filled without word-only fields:

```ts
it("fills phrase usage context without phonetic symbol or part of speech", async () => {
  const draft: TermDraft = {
    text: "look after",
    termType: "phrase",
    meanings: [{ chineseMeaning: "照顾", fieldSources: { chineseMeaning: "parsed" } }],
  };
  const enriched = await mockEnrichTerm(draft);
  expect(enriched.phoneticSymbol).toBeUndefined();
  expect(enriched.meanings[0].partOfSpeech).toBeUndefined();
  expect(enriched.meanings[0].chineseMeaning).toBe("照顾");
  expect(enriched.meanings[0].usageContext).toContain("常用场景");
});
```

- [ ] **Step 2: Run enrichment test**

Run: `npm test -- tests/unit/enrichment.test.ts`

Expected: PASS with the existing implementation. This confirms the phrase rule before import action changes.

- [ ] **Step 3: Add future web lookup source label**

In `src/lib/types.ts`, update `FieldSource`:

```ts
export type FieldSource = "parsed" | "ai_generated" | "mock_generated" | "web_lookup" | "edited";
```

- [ ] **Step 4: Update import action target group handling**

In `src/app/teacher/import/actions.ts`, replace the default group selection in `parseImportAction` with explicit form handling:

```ts
export async function parseImportAction(formData: FormData) {
  const content = String(formData.get("content") ?? "");
  const targetGroupId = String(formData.get("targetGroupId") ?? "");
  const targetGroup = await resolveTargetGroup(targetGroupId);
  const parsed = await parseImportFormData(formData, content);

  if (parsed.length === 0) {
    redirect(`/teacher?groupId=${targetGroup.id}&error=empty-import`);
  }

  const enriched = await Promise.all(parsed.map(enrichTermDraft));
  const batch = await prisma.importBatch.create({
    data: {
      sourceType: "paste",
      fileName: getImportFileName(formData),
      targetGroupId: targetGroup.id,
      status: "preview",
      rows: {
        create: enriched.map((row, index) => ({
          rowIndex: index,
          rawText: row.text,
          parsedJson: JSON.stringify(parsed[index]),
          enrichedJson: JSON.stringify(row),
          duplicateStatus: "unchecked",
          validationStatus: "valid",
        })),
      },
    },
  });
  redirect(`/teacher/import/${batch.id}/preview`);
}
```

Add helpers in the same file:

```ts
function getImportFileName(formData: FormData) {
  const file = formData.get("file");
  return file instanceof File && file.size > 0 ? file.name : null;
}

async function resolveTargetGroup(groupId: string) {
  if (groupId) {
    const selected = await prisma.group.findUnique({ where: { id: groupId } });
    if (selected) return selected;
  }

  const existing = await prisma.group.findFirst({
    orderBy: { sortOrder: "asc" },
  });
  if (existing) return existing;

  return prisma.group.create({
    data: { name: "1年级上册", sortOrder: 1 },
  });
}
```

Remove the old `getDefaultGroup()` helper after replacing its usage.

- [ ] **Step 5: Update confirm redirect**

In `confirmImportAction`, replace the final redirect:

```ts
redirect(`/teacher?groupId=${batch.targetGroupId}`);
```

- [ ] **Step 6: Run focused tests**

Run: `npm test -- tests/unit/enrichment.test.ts tests/unit/import-parser.test.ts`

Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add src/app/teacher/import/actions.ts src/lib/types.ts tests/unit/enrichment.test.ts
git commit -m "feat: scope teacher imports to selected group"
```

---

### Task 3: Teacher Workbench Page

**Files:**
- Create: `src/app/teacher/page.tsx`
- Modify: `src/app/teacher/import/page.tsx`
- Modify: `src/app/page.tsx`
- Modify: `src/app/globals.css`

- [ ] **Step 1: Write E2E expectations for `/teacher`**

In `tests/e2e/teacher-import.spec.ts`, add:

```ts
test("teacher entry shows default category outline", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("link", { name: "老师入口" }).click();
  await expect(page).toHaveURL(/\/teacher/);
  await expect(page.getByRole("heading", { name: "老师工作台" })).toBeVisible();
  await expect(page.getByRole("link", { name: "1年级上册" })).toBeVisible();
  await expect(page.getByRole("link", { name: "6年级下册" })).toBeVisible();
  await expect(page.getByRole("button", { name: "解析到当前分类" })).toBeVisible();
});
```

- [ ] **Step 2: Run the new E2E to verify failure**

Run: `npm run test:e2e -- tests/e2e/teacher-import.spec.ts --grep "teacher entry shows default category outline"`

Expected: FAIL because `/teacher` does not exist and the home link still points to `/teacher/import`.

- [ ] **Step 3: Update home link**

In `src/app/page.tsx`, change:

```tsx
<Link href="/teacher">老师入口</Link>
```

- [ ] **Step 4: Build `/teacher` workbench page**

Create `src/app/teacher/page.tsx`:

```tsx
import Link from "next/link";
import { parseImportAction } from "./import/actions";
import { getTeacherGroups, getTeacherGroupTerms, selectTeacherGroup, summarizeTeacherTerms } from "@/lib/teacher/groups";

type TeacherPageProps = {
  searchParams: Promise<{ groupId?: string; tab?: string; error?: string }>;
};

export default async function TeacherPage({ searchParams }: TeacherPageProps) {
  const params = await searchParams;
  const groups = await getTeacherGroups();
  const selectedGroup = selectTeacherGroup(groups, params.groupId);
  const terms = selectedGroup ? await getTeacherGroupTerms(selectedGroup.id) : [];
  const summary = summarizeTeacherTerms(terms);
  const activeTab = params.tab === "phrase" ? "phrase" : "word";
  const visibleTerms = terms.filter((term) => term.termType === activeTab);

  return (
    <main className="teacher-workbench">
      <aside className="teacher-sidebar" aria-label="分类大纲">
        <h1>老师工作台</h1>
        <nav className="teacher-groups">
          {groups.map((group) => (
            <Link
              className={group.id === selectedGroup?.id ? "teacher-group active" : "teacher-group"}
              href={`/teacher?groupId=${group.id}&tab=${activeTab}`}
              key={group.id}
            >
              {group.name}
            </Link>
          ))}
        </nav>
      </aside>

      <section className="teacher-main">
        <header className="teacher-header">
          <div>
            <p className="eyebrow">当前分类</p>
            <h2>{selectedGroup?.name ?? "暂无分类"}</h2>
          </div>
          <div className="teacher-stats">
            <span>单词 {summary.wordCount}</span>
            <span>短语 {summary.phraseCount}</span>
            <span>待补全 {summary.missingFieldCount}</span>
          </div>
        </header>

        {params.error === "empty-import" ? <p className="form-error">请先上传文件或填写导入内容。</p> : null}

        {selectedGroup ? (
          <form action={parseImportAction} className="panel teacher-import-panel">
            <input type="hidden" name="targetGroupId" value={selectedGroup.id} />
            <label htmlFor="file">上传 PDF / Word / TXT 文件</label>
            <input
              id="file"
              name="file"
              type="file"
              accept=".pdf,.docx,.txt,text/plain,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
            />
            <label htmlFor="content">粘贴导入内容</label>
            <textarea id="content" name="content" rows={6} />
            <button type="submit">解析到当前分类</button>
          </form>
        ) : (
          <section className="panel">暂无分类，请先运行种子数据。</section>
        )}

        <div className="teacher-tabs">
          <Link className={activeTab === "word" ? "active" : ""} href={`/teacher?groupId=${selectedGroup?.id ?? ""}&tab=word`}>
            单词
          </Link>
          <Link className={activeTab === "phrase" ? "active" : ""} href={`/teacher?groupId=${selectedGroup?.id ?? ""}&tab=phrase`}>
            短语
          </Link>
        </div>

        <section className="teacher-term-list">
          {visibleTerms.length === 0 ? (
            <p className="empty-state">当前分类暂无{activeTab === "phrase" ? "短语" : "单词"}。</p>
          ) : (
            visibleTerms.map((term) => (
              <article className="teacher-term-card" key={term.id}>
                <div>
                  <strong>{term.text}</strong>
                  {term.termType === "word" ? <span>{term.meanings[0]?.partOfSpeech}</span> : <span>短语</span>}
                </div>
                {term.termType === "word" && term.meanings[0]?.exampleSentence ? <p>{term.meanings[0].exampleSentence}</p> : null}
                {term.termType === "phrase" && term.meanings[0]?.usageContext ? <p>{term.meanings[0].usageContext}</p> : null}
                <p>{term.meanings.map((meaning) => meaning.chineseMeaning).filter(Boolean).join("；")}</p>
              </article>
            ))
          )}
        </section>
      </section>
    </main>
  );
}
```

- [ ] **Step 5: Redirect old import page**

Replace `src/app/teacher/import/page.tsx` with:

```tsx
import { redirect } from "next/navigation";

export default function TeacherImportPage() {
  redirect("/teacher");
}
```

- [ ] **Step 6: Add workbench CSS**

Append to `src/app/globals.css`:

```css
.teacher-workbench {
  min-height: 100dvh;
  display: grid;
  grid-template-columns: 260px 1fr;
  background: #f6f7f9;
}

.teacher-sidebar {
  border-right: 1px solid #e5e7eb;
  background: #fff;
  padding: 20px;
}

.teacher-sidebar h1 {
  margin: 0 0 16px;
  font-size: 22px;
}

.teacher-groups {
  display: grid;
  gap: 8px;
}

.teacher-group {
  border: 1px solid #dde2ea;
  border-radius: 8px;
  padding: 10px 12px;
  background: #fff;
}

.teacher-group.active {
  border-color: #2563eb;
  background: #eff6ff;
  color: #1d4ed8;
  font-weight: 700;
}

.teacher-main {
  min-width: 0;
  padding: 24px;
  display: grid;
  align-content: start;
  gap: 16px;
}

.teacher-header {
  display: flex;
  justify-content: space-between;
  gap: 16px;
  align-items: center;
}

.teacher-header h2,
.teacher-header p {
  margin: 0;
}

.eyebrow {
  color: #64748b;
  font-size: 13px;
}

.teacher-stats {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.teacher-stats span,
.teacher-tabs a {
  border: 1px solid #dde2ea;
  border-radius: 8px;
  background: #fff;
  padding: 8px 10px;
}

.teacher-import-panel textarea {
  min-height: 120px;
}

.form-error {
  margin: 0;
  color: #b91c1c;
  font-weight: 700;
}

.teacher-tabs {
  display: flex;
  gap: 8px;
}

.teacher-tabs a.active {
  background: #2563eb;
  color: #fff;
  border-color: #2563eb;
  font-weight: 700;
}

.teacher-term-list {
  display: grid;
  gap: 10px;
}

.teacher-term-card,
.empty-state {
  background: #fff;
  border: 1px solid #dde2ea;
  border-radius: 8px;
  padding: 14px;
}

.teacher-term-card div {
  display: flex;
  align-items: center;
  gap: 10px;
}

.teacher-term-card p {
  margin: 8px 0 0;
}

@media (max-width: 760px) {
  .teacher-workbench {
    height: 100dvh;
    grid-template-columns: 1fr;
    grid-template-rows: auto 1fr;
    overflow: hidden;
  }

  .teacher-sidebar {
    border-right: 0;
    border-bottom: 1px solid #e5e7eb;
    padding: 14px;
  }

  .teacher-groups {
    grid-auto-flow: column;
    grid-auto-columns: max-content;
    overflow-x: auto;
    padding-bottom: 4px;
  }

  .teacher-main {
    overflow: auto;
    padding: 16px;
  }

  .teacher-header {
    align-items: flex-start;
    flex-direction: column;
  }
}
```

- [ ] **Step 7: Run typecheck and E2E**

Run: `npm run typecheck`

Expected: PASS.

Run: `npm run test:e2e -- tests/e2e/teacher-import.spec.ts --grep "teacher entry shows default category outline"`

Expected: PASS for the new `/teacher` outline test.

- [ ] **Step 8: Commit**

```bash
git add src/app/page.tsx src/app/teacher/page.tsx src/app/teacher/import/page.tsx src/app/globals.css tests/e2e/teacher-import.spec.ts
git commit -m "feat: add teacher category workbench"
```

---

### Task 4: Preview And E2E Flow Updates

**Files:**
- Modify: `src/app/teacher/import/[batchId]/preview/page.tsx`
- Modify: `tests/e2e/teacher-import.spec.ts`
- Modify: `tests/e2e/full-flow.spec.ts`

- [ ] **Step 1: Update E2E tests to use `/teacher`**

In `tests/e2e/teacher-import.spec.ts`, replace direct `/teacher/import` navigation with `/teacher`. Update button name:

```ts
await page.goto("/teacher");
await page.getByLabel("粘贴导入内容").fill("apple /ˈæpəl/ n. 苹果 I eat an apple.");
await page.getByRole("button", { name: "解析到当前分类" }).click();
```

Add selected category import assertion:

```ts
test("teacher can import into a selected category and view split content", async ({ page }) => {
  await page.goto("/teacher");
  await page.getByRole("link", { name: "2年级上册" }).click();
  await page.getByLabel("粘贴导入内容").fill("look after 照顾 She looks after her brother.");
  await page.getByRole("button", { name: "解析到当前分类" }).click();
  await page.getByRole("button", { name: "确认导入" }).click();

  await expect(page.getByRole("heading", { name: "2年级上册" })).toBeVisible();
  await page.getByRole("link", { name: "短语" }).click();
  await expect(page.getByText("look after")).toBeVisible();
  await expect(page.getByText("常用场景")).toBeVisible();
});
```

In `tests/e2e/full-flow.spec.ts`, use:

```ts
await page.goto("/teacher");
await page.getByLabel("粘贴导入内容").fill("apple /ˈæpəl/ n. 苹果 I eat an apple.");
await page.getByRole("button", { name: "解析到当前分类" }).click();
```

- [ ] **Step 2: Add preview category context**

In `src/app/teacher/import/[batchId]/preview/page.tsx`, load the batch group and add a return link:

```tsx
import Link from "next/link";
import type { TermDraft } from "@/lib/types";
import { confirmImportAction, getImportBatch, getPreviewRows } from "../../actions";
```

Then inside the component:

```tsx
const batch = await getImportBatch(batchId);
```

Render under `<h1>`:

```tsx
{batch ? <p>目标分类：{batch.group.name}</p> : null}
```

Render after the confirmation form:

```tsx
{batch ? <Link href={`/teacher?groupId=${batch.targetGroupId}`}>返回当前分类</Link> : null}
```

Add `getImportBatch` to `src/app/teacher/import/actions.ts`. `ImportBatch` does not have a Prisma relation to `Group`, so load the group separately:

```ts
export async function getImportBatch(batchId: string) {
  const batch = await prisma.importBatch.findUnique({ where: { id: batchId } });
  if (!batch) return null;
  const group = await prisma.group.findUnique({ where: { id: batch.targetGroupId } });
  return group ? { ...batch, group } : null;
}
```

- [ ] **Step 3: Run focused E2E**

Run: `npm run test:e2e -- tests/e2e/teacher-import.spec.ts tests/e2e/full-flow.spec.ts`

Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add src/app/teacher/import/actions.ts 'src/app/teacher/import/[batchId]/preview/page.tsx' tests/e2e/teacher-import.spec.ts tests/e2e/full-flow.spec.ts
git commit -m "test: cover category teacher import flow"
```

---

### Task 5: Final Verification

**Files:**
- No planned code changes unless verification exposes an issue.

- [ ] **Step 1: Run unit tests**

Run: `npm test`

Expected: PASS.

- [ ] **Step 2: Run typecheck**

Run: `npm run typecheck`

Expected: PASS.

- [ ] **Step 3: Run teacher E2E**

Run: `npm run test:e2e -- tests/e2e/teacher-import.spec.ts`

Expected: PASS.

- [ ] **Step 4: Check git status**

Run: `git status --short --branch`

Expected: branch is ahead of remote with no unstaged changes.

- [ ] **Step 5: Commit any verification fixes**

If verification required fixes in `src/app/teacher/page.tsx` or `tests/e2e/teacher-import.spec.ts`:

```bash
git add src/app/teacher/page.tsx tests/e2e/teacher-import.spec.ts
git commit -m "fix: stabilize teacher category workbench"
```

If no fixes were needed, do not create an empty commit.
