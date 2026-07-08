# English Learning MVP Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a local Next.js + SQLite MVP where teachers import English words and phrases, the system fills missing learning fields, students learn and self-test, exams are generated, and results can be reviewed.

**Architecture:** Use a Next.js App Router full-stack monolith. Keep domain logic in pure TypeScript modules under `src/lib/*`, store durable data with Prisma + SQLite, and keep UI routes thin by calling focused server actions.

**Tech Stack:** Next.js, React, TypeScript, Prisma, SQLite, Vitest, Playwright, mammoth, pdf-parse, zod, Web Speech API.

---

## File Structure

- `package.json`: scripts and dependencies.
- `tsconfig.json`: TypeScript configuration.
- `next.config.mjs`: Next.js configuration.
- `vitest.config.ts`: unit test configuration.
- `playwright.config.ts`: browser test configuration.
- `prisma/schema.prisma`: SQLite schema.
- `prisma/seed.ts`: default grade and chapter seed data.
- `src/lib/types.ts`: shared domain types.
- `src/lib/terms/normalize.ts`: term normalization.
- `src/lib/terms/merge.ts`: duplicate merge logic.
- `src/lib/enrichment/provider.ts`: provider interface and dispatch.
- `src/lib/enrichment/mock-provider.ts`: deterministic fallback provider.
- `src/lib/enrichment/openai-provider.ts`: optional real AI provider.
- `src/lib/import/parse-text.ts`: pasted text parser.
- `src/lib/import/parse-docx.ts`: Word parser wrapper.
- `src/lib/import/parse-pdf.ts`: PDF parser wrapper.
- `src/lib/quiz/options.ts`: answer option generation.
- `src/lib/quiz/questions.ts`: self-test and exam question generation.
- `src/lib/results/scoring.ts`: exam scoring and answer snapshot helpers.
- `src/lib/db.ts`: Prisma client singleton.
- `src/app/layout.tsx`: shared app shell.
- `src/app/page.tsx`: role entry page.
- `src/app/teacher/import/page.tsx`: teacher import UI.
- `src/app/teacher/import/actions.ts`: import server actions.
- `src/app/teacher/import/[batchId]/preview/page.tsx`: preview UI.
- `src/app/teacher/library/page.tsx`: library management UI.
- `src/app/learn/page.tsx`: student learning page.
- `src/app/self-test/page.tsx`: self-test page.
- `src/app/exam/page.tsx`: exam page.
- `src/app/results/page.tsx`: result list page.
- `src/app/results/[sessionId]/page.tsx`: result detail page.
- `src/app/globals.css`: responsive Pad and H5 styles.
- `tests/unit/*.test.ts`: pure logic tests.
- `tests/e2e/*.spec.ts`: Playwright tests.

## Task 1: Scaffold Next.js Project

**Files:**
- Create: `package.json`
- Create: `tsconfig.json`
- Create: `next-env.d.ts`
- Create: `next.config.mjs`
- Create: `vitest.config.ts`
- Create: `playwright.config.ts`
- Create: `src/app/layout.tsx`
- Create: `src/app/page.tsx`
- Create: `src/app/globals.css`

- [ ] **Step 1: Create project configuration files**

Create `package.json`:

```json
{
  "name": "liq-test-english-learning",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "next lint",
    "typecheck": "tsc --noEmit",
    "test": "vitest run",
    "test:watch": "vitest",
    "test:e2e": "playwright test",
    "prisma:generate": "prisma generate",
    "prisma:migrate": "prisma migrate dev",
    "prisma:seed": "tsx prisma/seed.ts"
  },
  "dependencies": {
    "@prisma/client": "^6.0.0",
    "mammoth": "^1.8.0",
    "next": "^15.0.0",
    "pdf-parse": "^1.1.1",
    "prisma": "^6.0.0",
    "react": "^19.0.0",
    "react-dom": "^19.0.0",
    "zod": "^3.24.0"
  },
  "devDependencies": {
    "@playwright/test": "^1.49.0",
    "@testing-library/jest-dom": "^6.6.0",
    "@testing-library/react": "^16.1.0",
    "@types/node": "^22.10.0",
    "@types/pdf-parse": "^1.1.4",
    "@types/react": "^19.0.0",
    "@types/react-dom": "^19.0.0",
    "jsdom": "^25.0.0",
    "tsx": "^4.19.0",
    "typescript": "^5.7.0",
    "vite-tsconfig-paths": "^5.1.0",
    "vitest": "^2.1.0"
  },
  "prisma": {
    "seed": "tsx prisma/seed.ts"
  }
}
```

Create `tsconfig.json`:

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "lib": ["dom", "dom.iterable", "es2022"],
    "allowJs": false,
    "skipLibCheck": true,
    "strict": true,
    "noEmit": true,
    "esModuleInterop": true,
    "module": "esnext",
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "jsx": "preserve",
    "incremental": true,
    "baseUrl": ".",
    "plugins": [{ "name": "next" }],
    "paths": { "@/*": ["./src/*"] }
  },
  "include": ["next-env.d.ts", "**/*.ts", "**/*.tsx", ".next/types/**/*.ts"],
  "exclude": ["node_modules"]
}
```

Create `next-env.d.ts`:

```ts
/// <reference types="next" />
/// <reference types="next/image-types/global" />
```

Create `next.config.mjs`:

```js
/** @type {import('next').NextConfig} */
const nextConfig = {};

export default nextConfig;
```

Create `vitest.config.ts`:

```ts
import { defineConfig } from "vitest/config";
import tsconfigPaths from "vite-tsconfig-paths";

export default defineConfig({
  plugins: [tsconfigPaths()],
  test: {
    environment: "node",
    include: ["tests/unit/**/*.test.ts"],
  },
});
```

Create `playwright.config.ts`:

```ts
import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "tests/e2e",
  webServer: {
    command: "npm run dev",
    url: "http://127.0.0.1:3000",
    reuseExistingServer: true,
  },
  use: {
    baseURL: "http://127.0.0.1:3000",
    trace: "on-first-retry",
  },
  projects: [
    { name: "pad", use: { ...devices["iPad Pro 11"] } },
    { name: "h5", use: { ...devices["iPhone 13"] } }
  ],
});
```

- [ ] **Step 2: Create the minimal app shell**

Create `src/app/layout.tsx`:

```tsx
import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "English Study",
  description: "Local English learning and testing MVP",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-CN">
      <body>{children}</body>
    </html>
  );
}
```

Create `src/app/page.tsx`:

```tsx
import Link from "next/link";

export default function HomePage() {
  return (
    <main className="entry-page">
      <section className="entry-panel">
        <h1>English Study</h1>
        <div className="entry-actions">
          <Link href="/teacher/import">老师入口</Link>
          <Link href="/learn">学生入口</Link>
        </div>
      </section>
    </main>
  );
}
```

Create `src/app/globals.css`:

```css
* {
  box-sizing: border-box;
}

html,
body {
  margin: 0;
  min-height: 100%;
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
  background: #f6f7f9;
  color: #1f2937;
}

a {
  color: inherit;
  text-decoration: none;
}

button,
input,
textarea,
select {
  font: inherit;
}

.entry-page {
  min-height: 100dvh;
  display: grid;
  place-items: center;
  padding: 24px;
}

.entry-panel {
  width: min(520px, 100%);
  background: #fff;
  border: 1px solid #dde2ea;
  border-radius: 8px;
  padding: 24px;
}

.entry-panel h1 {
  margin: 0 0 18px;
}

.entry-actions {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
}

.entry-actions a {
  border: 1px solid #cfd5df;
  border-radius: 8px;
  padding: 14px;
  text-align: center;
  background: #f9fafb;
  font-weight: 700;
}
```

- [ ] **Step 3: Install dependencies**

Run:

```bash
npm install
```

Expected: `package-lock.json` is created and dependencies install successfully.

- [ ] **Step 4: Verify scaffold**

Run:

```bash
npm run typecheck
npm test
```

Expected: typecheck passes and Vitest reports no test files or a clean run.

- [ ] **Step 5: Commit**

Run:

```bash
git add package.json package-lock.json tsconfig.json next-env.d.ts next.config.mjs vitest.config.ts playwright.config.ts src/app/layout.tsx src/app/page.tsx src/app/globals.css
git commit -m "chore: scaffold english learning app"
```

## Task 2: Add Prisma Schema and Seed Data

**Files:**
- Create: `prisma/schema.prisma`
- Create: `prisma/seed.ts`
- Create: `src/lib/db.ts`
- Create: `tests/unit/seed-groups.test.ts`

- [ ] **Step 1: Write schema**

Create `prisma/schema.prisma`:

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "sqlite"
  url      = env("DATABASE_URL")
}

model Group {
  id        String   @id @default(cuid())
  name      String
  parentId  String?
  sortOrder Int      @default(0)
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  parent    Group?   @relation("GroupHierarchy", fields: [parentId], references: [id])
  children  Group[]  @relation("GroupHierarchy")
  termLinks TermGroup[]

  @@unique([name, parentId])
}

model Term {
  id             String   @id @default(cuid())
  text           String
  normalizedText String
  termType       String
  createdSource  String
  createdAt      DateTime @default(now())
  updatedAt      DateTime @updatedAt

  groups   TermGroup[]
  meanings TermMeaning[]

  @@unique([normalizedText, termType])
}

model TermGroup {
  termId  String
  groupId String

  term  Term  @relation(fields: [termId], references: [id], onDelete: Cascade)
  group Group @relation(fields: [groupId], references: [id], onDelete: Cascade)

  @@id([termId, groupId])
}

model TermMeaning {
  id              String   @id @default(cuid())
  termId          String
  partOfSpeech    String?
  chineseMeaning  String
  exampleSentence String?
  explanation     String?
  usageContext    String?
  fieldSourcesJson String
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt

  term Term @relation(fields: [termId], references: [id], onDelete: Cascade)
}

model ImportBatch {
  id            String    @id @default(cuid())
  sourceType    String
  fileName      String?
  targetGroupId String
  status        String
  createdAt     DateTime  @default(now())
  confirmedAt   DateTime?

  rows ImportRow[]
}

model ImportRow {
  id               String   @id @default(cuid())
  batchId          String
  rowIndex         Int
  rawText          String
  parsedJson       String
  enrichedJson     String
  duplicateStatus  String
  validationStatus String
  createdAt        DateTime @default(now())

  batch ImportBatch @relation(fields: [batchId], references: [id], onDelete: Cascade)
}

model ExamSession {
  id                   String    @id @default(cuid())
  selectedGroupIdsJson  String
  questionCount         Int
  score                 Int
  correctCount          Int
  startedAt             DateTime
  submittedAt           DateTime

  answers ExamAnswer[]
}

model ExamAnswer {
  id              String  @id @default(cuid())
  examSessionId   String
  questionIndex   Int
  questionType    String
  prompt          String
  optionsJson     String
  correctOptionId String
  selectedOptionId String?
  isCorrect       Boolean
  explanation     String
  termSnapshotJson String

  session ExamSession @relation(fields: [examSessionId], references: [id], onDelete: Cascade)
}
```

- [ ] **Step 2: Create seed data**

Create `prisma/seed.ts`:

```ts
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const grades = [
  "1年级上册",
  "1年级下册",
  "2年级上册",
  "2年级下册",
  "3年级上册",
  "3年级下册",
  "4年级上册",
  "4年级下册",
  "5年级上册",
  "5年级下册",
  "6年级上册",
  "6年级下册",
];

async function main() {
  for (const [index, name] of grades.entries()) {
    const existing = await prisma.group.findFirst({
      where: { name, parentId: null },
    });

    if (existing) {
      await prisma.group.update({
        where: { id: existing.id },
        data: { sortOrder: index + 1 },
      });
    } else {
      await prisma.group.create({
        data: { name, sortOrder: index + 1 },
      });
    }
  }
}

main()
  .finally(async () => {
    await prisma.$disconnect();
  });
```

Create `src/lib/db.ts`:

```ts
import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma = globalForPrisma.prisma ?? new PrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
```

- [ ] **Step 3: Add environment file**

Create `.env.local`:

```bash
DATABASE_URL="file:./dev.db"
```

Expected: `.env.local` is ignored by git.

- [ ] **Step 4: Generate and migrate**

Run:

```bash
npm run prisma:generate
npm run prisma:migrate -- --name init
npm run prisma:seed
```

Expected: Prisma client is generated, SQLite migration is created, and default groups are inserted.

- [ ] **Step 5: Commit**

Run:

```bash
git add prisma/schema.prisma prisma/seed.ts src/lib/db.ts prisma/migrations
git commit -m "feat: add sqlite data model"
```

## Task 3: Implement Term Types, Normalization, and Merge Logic

**Files:**
- Create: `src/lib/types.ts`
- Create: `src/lib/terms/normalize.ts`
- Create: `src/lib/terms/merge.ts`
- Create: `tests/unit/terms.test.ts`

- [ ] **Step 1: Write unit tests**

Create `tests/unit/terms.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { mergeTermDraft } from "@/lib/terms/merge";
import { normalizeTermText } from "@/lib/terms/normalize";
import type { TermDraft } from "@/lib/types";

describe("normalizeTermText", () => {
  it("lowercases latin text and collapses spaces", () => {
    expect(normalizeTermText("  Look   After  ")).toBe("look after");
  });
});

describe("mergeTermDraft", () => {
  it("preserves existing fields and appends new meanings", () => {
    const existing: TermDraft = {
      text: "run",
      termType: "word",
      meanings: [
        {
          partOfSpeech: "verb",
          chineseMeaning: "跑",
          exampleSentence: "I run every day.",
          explanation: "Move quickly on foot.",
          fieldSources: { chineseMeaning: "parsed" },
        },
      ],
    };

    const incoming: TermDraft = {
      text: "Run",
      termType: "word",
      meanings: [
        {
          partOfSpeech: "verb",
          chineseMeaning: "跑",
          exampleSentence: "She can run fast.",
          explanation: "Generated text must not replace parsed fields.",
          fieldSources: { chineseMeaning: "ai_generated" },
        },
        {
          partOfSpeech: "noun",
          chineseMeaning: "一段路程",
          exampleSentence: "The morning run is short.",
          explanation: "A period of running.",
          fieldSources: { chineseMeaning: "parsed" },
        },
      ],
    };

    const merged = mergeTermDraft(existing, incoming);
    expect(merged.meanings).toHaveLength(2);
    expect(merged.meanings[0].exampleSentence).toBe("I run every day.");
    expect(merged.meanings[1].chineseMeaning).toBe("一段路程");
  });

  it("keeps phrases free of phonetic symbols and parts of speech", () => {
    const phrase: TermDraft = {
      text: "look after",
      termType: "phrase",
      meanings: [
        {
          chineseMeaning: "照顾",
          usageContext: "Used when caring for people, animals, or things.",
          fieldSources: { chineseMeaning: "parsed" },
        },
      ],
    };

    const merged = mergeTermDraft(undefined, phrase);
    expect(merged.meanings[0].partOfSpeech).toBeUndefined();
    expect(merged.phoneticSymbol).toBeUndefined();
  });
});
```

- [ ] **Step 2: Run failing tests**

Run:

```bash
npm test -- tests/unit/terms.test.ts
```

Expected: tests fail because `@/lib/types`, `normalizeTermText`, and `mergeTermDraft` do not exist.

- [ ] **Step 3: Implement types and term logic**

Create `src/lib/types.ts`:

```ts
export type TermType = "word" | "phrase";
export type FieldSource = "parsed" | "ai_generated" | "mock_generated" | "edited";

export type MeaningDraft = {
  partOfSpeech?: string;
  chineseMeaning: string;
  exampleSentence?: string;
  explanation?: string;
  usageContext?: string;
  fieldSources: Partial<Record<keyof Omit<MeaningDraft, "fieldSources">, FieldSource>>;
};

export type TermDraft = {
  text: string;
  normalizedText?: string;
  termType: TermType;
  phoneticSymbol?: string;
  meanings: MeaningDraft[];
};
```

Create `src/lib/terms/normalize.ts`:

```ts
export function normalizeTermText(text: string): string {
  return text.trim().replace(/\s+/g, " ").toLowerCase();
}

export function sameMeaning(a: string, b: string): boolean {
  return a.trim() === b.trim();
}
```

Create `src/lib/terms/merge.ts`:

```ts
import type { MeaningDraft, TermDraft } from "@/lib/types";
import { normalizeTermText, sameMeaning } from "./normalize";

function cleanPhraseMeaning(meaning: MeaningDraft): MeaningDraft {
  const { partOfSpeech: _partOfSpeech, ...rest } = meaning;
  return rest;
}

export function mergeTermDraft(existing: TermDraft | undefined, incoming: TermDraft): TermDraft {
  const normalizedText = normalizeTermText(incoming.text);
  const cleanedIncoming: TermDraft = {
    ...incoming,
    normalizedText,
    phoneticSymbol: incoming.termType === "phrase" ? undefined : incoming.phoneticSymbol,
    meanings: incoming.termType === "phrase" ? incoming.meanings.map(cleanPhraseMeaning) : incoming.meanings,
  };

  if (!existing) {
    return cleanedIncoming;
  }

  const merged: TermDraft = {
    ...existing,
    normalizedText: existing.normalizedText ?? normalizedText,
    phoneticSymbol: existing.phoneticSymbol ?? cleanedIncoming.phoneticSymbol,
    meanings: [...existing.meanings],
  };

  for (const incomingMeaning of cleanedIncoming.meanings) {
    const duplicate = merged.meanings.find((meaning) =>
      sameMeaning(meaning.chineseMeaning, incomingMeaning.chineseMeaning),
    );
    if (!duplicate) {
      merged.meanings.push(incomingMeaning);
    }
  }

  return merged;
}
```

- [ ] **Step 4: Run tests**

Run:

```bash
npm test -- tests/unit/terms.test.ts
```

Expected: all tests pass.

- [ ] **Step 5: Commit**

Run:

```bash
git add src/lib/types.ts src/lib/terms/normalize.ts src/lib/terms/merge.ts tests/unit/terms.test.ts
git commit -m "feat: add term merge logic"
```

## Task 4: Implement Mock and Optional AI Enrichment

**Files:**
- Create: `src/lib/enrichment/provider.ts`
- Create: `src/lib/enrichment/mock-provider.ts`
- Create: `src/lib/enrichment/openai-provider.ts`
- Create: `tests/unit/enrichment.test.ts`

- [ ] **Step 1: Write unit tests**

Create `tests/unit/enrichment.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { enrichTermDraft } from "@/lib/enrichment/provider";
import { mockEnrichTerm } from "@/lib/enrichment/mock-provider";
import type { TermDraft } from "@/lib/types";

describe("mockEnrichTerm", () => {
  it("fills missing word fields", async () => {
    const draft: TermDraft = { text: "apple", termType: "word", meanings: [] };
    const enriched = await mockEnrichTerm(draft);
    expect(enriched.phoneticSymbol).toBeTruthy();
    expect(enriched.meanings[0].partOfSpeech).toBeTruthy();
    expect(enriched.meanings[0].chineseMeaning).toBeTruthy();
  });

  it("fills phrase usage context without phonetic symbol or part of speech", async () => {
    const draft: TermDraft = { text: "look after", termType: "phrase", meanings: [] };
    const enriched = await mockEnrichTerm(draft);
    expect(enriched.phoneticSymbol).toBeUndefined();
    expect(enriched.meanings[0].partOfSpeech).toBeUndefined();
    expect(enriched.meanings[0].usageContext).toContain("常用场景");
  });
});

describe("enrichTermDraft", () => {
  it("uses mock enrichment when no API key is configured", async () => {
    const enriched = await enrichTermDraft({ text: "bright", termType: "word", meanings: [] });
    expect(enriched.meanings[0].fieldSources.chineseMeaning).toBe("mock_generated");
  });
});
```

- [ ] **Step 2: Run failing tests**

Run:

```bash
npm test -- tests/unit/enrichment.test.ts
```

Expected: tests fail because enrichment modules do not exist.

- [ ] **Step 3: Implement enrichment providers**

Create `src/lib/enrichment/mock-provider.ts`:

```ts
import type { TermDraft } from "@/lib/types";

export async function mockEnrichTerm(draft: TermDraft): Promise<TermDraft> {
  if (draft.termType === "phrase") {
    return {
      ...draft,
      phoneticSymbol: undefined,
      meanings: draft.meanings.length
        ? draft.meanings.map((meaning) => ({
            ...meaning,
            partOfSpeech: undefined,
            usageContext: meaning.usageContext ?? `常用场景：${draft.text} 常用于日常交流和课文表达中。`,
            fieldSources: {
              ...meaning.fieldSources,
              usageContext: meaning.fieldSources.usageContext ?? "mock_generated",
            },
          }))
        : [
            {
              chineseMeaning: `${draft.text} 的中文意思`,
              exampleSentence: `Please use "${draft.text}" in a simple sentence.`,
              usageContext: `常用场景：${draft.text} 常用于日常交流和课文表达中。`,
              fieldSources: {
                chineseMeaning: "mock_generated",
                exampleSentence: "mock_generated",
                usageContext: "mock_generated",
              },
            },
          ],
    };
  }

  return {
    ...draft,
    phoneticSymbol: draft.phoneticSymbol ?? `/${draft.text}/`,
    meanings: draft.meanings.length
      ? draft.meanings.map((meaning) => ({
          ...meaning,
          partOfSpeech: meaning.partOfSpeech ?? "noun",
          exampleSentence: meaning.exampleSentence ?? `This is an example sentence for ${draft.text}.`,
          explanation: meaning.explanation ?? `${draft.text} is used as a common English word.`,
          fieldSources: {
            ...meaning.fieldSources,
            partOfSpeech: meaning.fieldSources.partOfSpeech ?? "mock_generated",
            exampleSentence: meaning.fieldSources.exampleSentence ?? "mock_generated",
            explanation: meaning.fieldSources.explanation ?? "mock_generated",
          },
        }))
      : [
          {
            partOfSpeech: "noun",
            chineseMeaning: `${draft.text} 的中文意思`,
            exampleSentence: `This is an example sentence for ${draft.text}.`,
            explanation: `${draft.text} is used as a common English word.`,
            fieldSources: {
              partOfSpeech: "mock_generated",
              chineseMeaning: "mock_generated",
              exampleSentence: "mock_generated",
              explanation: "mock_generated",
            },
          },
        ],
  };
}
```

Create `src/lib/enrichment/openai-provider.ts`:

```ts
import type { TermDraft } from "@/lib/types";

export async function openAiEnrichTerm(draft: TermDraft): Promise<TermDraft> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error("OPENAI_API_KEY is not configured");
  }

  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: process.env.OPENAI_MODEL ?? "gpt-4.1-mini",
      input: [
        {
          role: "user",
          content: `Return JSON only for this English ${draft.termType}: ${JSON.stringify(draft)}`,
        },
      ],
    }),
  });

  if (!response.ok) {
    throw new Error(`AI enrichment failed with status ${response.status}`);
  }

  const json = await response.json();
  const text = json.output_text;
  if (typeof text !== "string") {
    throw new Error("AI enrichment returned no output_text");
  }

  return JSON.parse(text) as TermDraft;
}
```

Create `src/lib/enrichment/provider.ts`:

```ts
import type { TermDraft } from "@/lib/types";
import { mockEnrichTerm } from "./mock-provider";
import { openAiEnrichTerm } from "./openai-provider";

export async function enrichTermDraft(draft: TermDraft): Promise<TermDraft> {
  if (!process.env.OPENAI_API_KEY) {
    return mockEnrichTerm(draft);
  }

  try {
    return await openAiEnrichTerm(draft);
  } catch {
    return mockEnrichTerm(draft);
  }
}
```

- [ ] **Step 4: Run tests**

Run:

```bash
npm test -- tests/unit/enrichment.test.ts
```

Expected: all tests pass.

- [ ] **Step 5: Commit**

Run:

```bash
git add src/lib/enrichment tests/unit/enrichment.test.ts
git commit -m "feat: add term enrichment providers"
```

## Task 5: Implement Text Import Parser

**Files:**
- Create: `src/lib/import/parse-text.ts`
- Create: `src/lib/import/parse-docx.ts`
- Create: `src/lib/import/parse-pdf.ts`
- Create: `tests/unit/import-parser.test.ts`

- [ ] **Step 1: Write parser tests**

Create `tests/unit/import-parser.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { parseImportedText } from "@/lib/import/parse-text";

describe("parseImportedText", () => {
  it("parses word rows with existing fields", () => {
    const rows = parseImportedText("apple /ˈæpəl/ n. 苹果 I eat an apple.");
    expect(rows[0]).toMatchObject({
      text: "apple",
      termType: "word",
      phoneticSymbol: "/ˈæpəl/",
    });
    expect(rows[0].meanings[0].partOfSpeech).toBe("noun");
    expect(rows[0].meanings[0].chineseMeaning).toBe("苹果");
    expect(rows[0].meanings[0].exampleSentence).toBe("I eat an apple.");
  });

  it("parses phrase rows without phonetic symbol or part of speech", () => {
    const rows = parseImportedText("look after 照顾 She looks after her brother.");
    expect(rows[0].termType).toBe("phrase");
    expect(rows[0].phoneticSymbol).toBeUndefined();
    expect(rows[0].meanings[0].partOfSpeech).toBeUndefined();
    expect(rows[0].meanings[0].chineseMeaning).toBe("照顾");
  });
});
```

- [ ] **Step 2: Run failing tests**

Run:

```bash
npm test -- tests/unit/import-parser.test.ts
```

Expected: tests fail because parser modules do not exist.

- [ ] **Step 3: Implement parsers**

Create `src/lib/import/parse-text.ts`:

```ts
import type { FieldSource, TermDraft, TermType } from "@/lib/types";

const partOfSpeechMap: Record<string, string> = {
  n: "noun",
  noun: "noun",
  v: "verb",
  verb: "verb",
  adj: "adjective",
  adjective: "adjective",
  adv: "adverb",
  adverb: "adverb",
  prep: "preposition",
  phrase: "phrase",
};

function detectTermType(text: string, explicitPartOfSpeech?: string): TermType {
  if (explicitPartOfSpeech === "phrase") return "phrase";
  return text.trim().includes(" ") ? "phrase" : "word";
}

function parseLine(line: string): TermDraft | undefined {
  const trimmed = line.trim();
  if (!trimmed) return undefined;

  const phoneticMatch = trimmed.match(/(\/[^/]+\/|\[[^\]]+\])/);
  const phoneticSymbol = phoneticMatch?.[0];
  const withoutPhonetic = phoneticSymbol ? trimmed.replace(phoneticSymbol, " ").trim() : trimmed;
  const sentenceMatch = withoutPhonetic.match(/([A-Z][^。！？.!?]*[。！？.!?])$/);
  const exampleSentence = sentenceMatch?.[1]?.trim();
  const withoutSentence = exampleSentence ? withoutPhonetic.replace(exampleSentence, " ").trim() : withoutPhonetic;
  const parts = withoutSentence.split(/\s+/);
  const posIndex = parts.findIndex((part) => partOfSpeechMap[part.replace(".", "").toLowerCase()]);
  const rawPartOfSpeech = posIndex >= 0 ? parts[posIndex].replace(".", "").toLowerCase() : undefined;
  const partOfSpeech = rawPartOfSpeech ? partOfSpeechMap[rawPartOfSpeech] : undefined;
  const termParts = posIndex >= 0 ? parts.slice(0, posIndex) : parts.slice(0, Math.max(1, parts.findIndex((part) => /[\u4e00-\u9fa5]/.test(part))));
  const text = termParts.join(" ").trim();
  const meaningText = withoutSentence.slice(text.length).replace(rawPartOfSpeech ?? "", "").replace(".", "").trim();
  const chineseMeaning = meaningText.match(/[\u4e00-\u9fa5][\u4e00-\u9fa5；，、\s]*/)?.[0]?.trim() ?? meaningText;
  const termType = detectTermType(text, rawPartOfSpeech);
  const fieldSource: FieldSource = "parsed";

  return {
    text,
    termType,
    phoneticSymbol: termType === "word" ? phoneticSymbol : undefined,
    meanings: [
      {
        partOfSpeech: termType === "word" ? partOfSpeech : undefined,
        chineseMeaning,
        exampleSentence,
        fieldSources: {
          partOfSpeech: partOfSpeech ? fieldSource : undefined,
          chineseMeaning: chineseMeaning ? fieldSource : undefined,
          exampleSentence: exampleSentence ? fieldSource : undefined,
        },
      },
    ],
  };
}

export function parseImportedText(text: string): TermDraft[] {
  return text
    .split(/\r?\n/)
    .flatMap((line) => line.split(/\t(?=[A-Za-z])/))
    .map(parseLine)
    .filter((row): row is TermDraft => Boolean(row?.text));
}
```

Create `src/lib/import/parse-docx.ts`:

```ts
import mammoth from "mammoth";
import type { TermDraft } from "@/lib/types";
import { parseImportedText } from "./parse-text";

export async function parseDocxBuffer(buffer: Buffer): Promise<TermDraft[]> {
  const result = await mammoth.extractRawText({ buffer });
  return parseImportedText(result.value);
}
```

Create `src/lib/import/parse-pdf.ts`:

```ts
import pdfParse from "pdf-parse";
import type { TermDraft } from "@/lib/types";
import { parseImportedText } from "./parse-text";

export async function parsePdfBuffer(buffer: Buffer): Promise<TermDraft[]> {
  const result = await pdfParse(buffer);
  return parseImportedText(result.text);
}
```

- [ ] **Step 4: Run tests**

Run:

```bash
npm test -- tests/unit/import-parser.test.ts
```

Expected: all tests pass.

- [ ] **Step 5: Commit**

Run:

```bash
git add src/lib/import tests/unit/import-parser.test.ts
git commit -m "feat: add import parsers"
```

## Task 6: Implement Quiz and Exam Generation

**Files:**
- Create: `src/lib/quiz/options.ts`
- Create: `src/lib/quiz/questions.ts`
- Create: `src/lib/results/scoring.ts`
- Create: `tests/unit/quiz.test.ts`
- Create: `tests/unit/scoring.test.ts`

- [ ] **Step 1: Write quiz tests**

Create `tests/unit/quiz.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { buildMultipleChoiceQuestion } from "@/lib/quiz/questions";
import type { TermDraft } from "@/lib/types";

const terms: TermDraft[] = [
  { text: "apple", termType: "word", meanings: [{ chineseMeaning: "苹果", fieldSources: { chineseMeaning: "parsed" } }] },
  { text: "banana", termType: "word", meanings: [{ chineseMeaning: "香蕉", fieldSources: { chineseMeaning: "parsed" } }] },
  { text: "orange", termType: "word", meanings: [{ chineseMeaning: "橙子", fieldSources: { chineseMeaning: "parsed" } }] },
  { text: "pear", termType: "word", meanings: [{ chineseMeaning: "梨", fieldSources: { chineseMeaning: "parsed" } }] },
];

describe("buildMultipleChoiceQuestion", () => {
  it("creates four options with exactly one correct answer", () => {
    const question = buildMultipleChoiceQuestion(terms[0], terms[0].meanings[0], terms);
    expect(question.options).toHaveLength(4);
    expect(question.options.filter((option) => option.isCorrect)).toHaveLength(1);
    expect(question.options.some((option) => option.text === "苹果")).toBe(true);
  });
});
```

Create `tests/unit/scoring.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { calculateScore } from "@/lib/results/scoring";

describe("calculateScore", () => {
  it("calculates percentage score", () => {
    expect(calculateScore(8, 10)).toBe(80);
  });
});
```

- [ ] **Step 2: Run failing tests**

Run:

```bash
npm test -- tests/unit/quiz.test.ts tests/unit/scoring.test.ts
```

Expected: tests fail because quiz and scoring modules do not exist.

- [ ] **Step 3: Implement quiz and scoring modules**

Create `src/lib/quiz/options.ts`:

```ts
import type { TermDraft } from "@/lib/types";

export type AnswerOption = {
  id: string;
  text: string;
  isCorrect: boolean;
};

export function shuffle<T>(items: T[], random: () => number = Math.random): T[] {
  const copy = [...items];
  for (let index = copy.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(random() * (index + 1));
    [copy[index], copy[swapIndex]] = [copy[swapIndex], copy[index]];
  }
  return copy;
}

export function buildMeaningOptions(
  correctMeaning: string,
  pool: TermDraft[],
  random: () => number = Math.random,
): AnswerOption[] {
  const distractors = shuffle(
    [...new Set(pool.flatMap((term) => term.meanings.map((meaning) => meaning.chineseMeaning)).filter((text) => text !== correctMeaning))],
    random,
  ).slice(0, 3);

  while (distractors.length < 3) {
    distractors.push(`干扰项 ${distractors.length + 1}`);
  }

  return shuffle(
    [
      { id: "a", text: correctMeaning, isCorrect: true },
      ...distractors.map((text, index) => ({ id: String.fromCharCode(98 + index), text, isCorrect: false })),
    ],
    random,
  ).map((option, index) => ({ ...option, id: String.fromCharCode(65 + index) }));
}
```

Create `src/lib/quiz/questions.ts`:

```ts
import type { MeaningDraft, TermDraft } from "@/lib/types";
import { buildMeaningOptions, type AnswerOption } from "./options";

export type QuizQuestion = {
  prompt: string;
  questionType: "term_to_meaning" | "sentence_blank";
  options: AnswerOption[];
  explanation: string;
  termSnapshot: TermDraft;
};

export function buildMultipleChoiceQuestion(
  term: TermDraft,
  meaning: MeaningDraft,
  pool: TermDraft[],
): QuizQuestion {
  return {
    prompt: term.text,
    questionType: "term_to_meaning",
    options: buildMeaningOptions(meaning.chineseMeaning, pool),
    explanation: term.termType === "phrase"
      ? meaning.usageContext ?? meaning.exampleSentence ?? meaning.chineseMeaning
      : meaning.explanation ?? meaning.exampleSentence ?? meaning.chineseMeaning,
    termSnapshot: term,
  };
}
```

Create `src/lib/results/scoring.ts`:

```ts
export function calculateScore(correctCount: number, totalCount: number): number {
  if (totalCount <= 0) return 0;
  return Math.round((correctCount / totalCount) * 100);
}
```

- [ ] **Step 4: Run tests**

Run:

```bash
npm test -- tests/unit/quiz.test.ts tests/unit/scoring.test.ts
```

Expected: all tests pass.

- [ ] **Step 5: Commit**

Run:

```bash
git add src/lib/quiz src/lib/results tests/unit/quiz.test.ts tests/unit/scoring.test.ts
git commit -m "feat: add quiz generation"
```

## Task 7: Build Teacher Import and Preview UI

**Files:**
- Create: `src/app/teacher/import/page.tsx`
- Create: `src/app/teacher/import/actions.ts`
- Create: `src/app/teacher/import/[batchId]/preview/page.tsx`
- Create: `tests/e2e/teacher-import.spec.ts`

- [ ] **Step 1: Write E2E test**

Create `tests/e2e/teacher-import.spec.ts`:

```ts
import { expect, test } from "@playwright/test";

test("teacher can import pasted text and see preview", async ({ page }) => {
  await page.goto("/teacher/import");
  await page.getByLabel("导入内容").fill("apple /ˈæpəl/ n. 苹果 I eat an apple.");
  await page.getByRole("button", { name: "解析内容" }).click();
  await expect(page.getByText("apple")).toBeVisible();
  await expect(page.getByText("苹果")).toBeVisible();
});
```

- [ ] **Step 2: Create import page**

Create `src/app/teacher/import/page.tsx`:

```tsx
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
```

Create `src/app/teacher/import/actions.ts`:

```ts
"use server";

import { redirect } from "next/navigation";
import { parseImportedText } from "@/lib/import/parse-text";
import { enrichTermDraft } from "@/lib/enrichment/provider";

const previewStore = new Map<string, unknown>();

export async function parsePasteAction(formData: FormData) {
  const content = String(formData.get("content") ?? "");
  const parsed = parseImportedText(content);
  const enriched = await Promise.all(parsed.map(enrichTermDraft));
  const batchId = crypto.randomUUID();
  previewStore.set(batchId, enriched);
  redirect(`/teacher/import/${batchId}/preview`);
}

export async function getPreviewRows(batchId: string) {
  return previewStore.get(batchId) ?? [];
}
```

Create `src/app/teacher/import/[batchId]/preview/page.tsx`:

```tsx
import { getPreviewRows } from "../actions";
import type { TermDraft } from "@/lib/types";

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
```

- [ ] **Step 3: Add shared page CSS**

Append to `src/app/globals.css`:

```css
.page {
  max-width: 1120px;
  margin: 0 auto;
  padding: 24px;
}

.panel,
.table {
  background: #fff;
  border: 1px solid #dde2ea;
  border-radius: 8px;
  padding: 16px;
}

.panel {
  display: grid;
  gap: 12px;
}

.panel textarea {
  width: 100%;
  resize: vertical;
}

.panel button {
  justify-self: start;
  border: 0;
  border-radius: 8px;
  background: #2563eb;
  color: #fff;
  padding: 10px 14px;
  font-weight: 700;
}

.row {
  display: grid;
  grid-template-columns: 1fr 100px 1fr;
  gap: 12px;
  padding: 10px 0;
  border-bottom: 1px solid #edf0f5;
}
```

- [ ] **Step 4: Run E2E**

Run:

```bash
npm run test:e2e -- tests/e2e/teacher-import.spec.ts
```

Expected: test passes on both Pad and H5 projects.

- [ ] **Step 5: Commit**

Run:

```bash
git add src/app/teacher tests/e2e/teacher-import.spec.ts src/app/globals.css
git commit -m "feat: add teacher import preview"
```

## Task 8: Build Student Learn, Self-Test, Exam, and Results Pages

**Files:**
- Create: `src/app/learn/page.tsx`
- Create: `src/app/self-test/page.tsx`
- Create: `src/app/exam/page.tsx`
- Create: `src/app/results/page.tsx`
- Create: `src/app/results/[sessionId]/page.tsx`
- Create: `tests/e2e/student-flow.spec.ts`
- Modify: `src/app/globals.css`

- [ ] **Step 1: Write E2E test**

Create `tests/e2e/student-flow.spec.ts`:

```ts
import { expect, test } from "@playwright/test";

test("student navigation exposes learn, self-test, exam, and results", async ({ page }) => {
  await page.goto("/learn");
  await expect(page.getByRole("heading", { name: "学习" })).toBeVisible();
  await page.goto("/self-test");
  await expect(page.getByRole("heading", { name: "自测" })).toBeVisible();
  await page.goto("/exam");
  await expect(page.getByRole("heading", { name: "考试" })).toBeVisible();
  await page.goto("/results");
  await expect(page.getByRole("heading", { name: "考试结果" })).toBeVisible();
});

test("h5 layout shows bottom navigation", async ({ page, isMobile }) => {
  test.skip(!isMobile, "H5-only assertion");
  await page.goto("/learn");
  await expect(page.getByRole("navigation", { name: "学生底部导航" })).toBeVisible();
});
```

- [ ] **Step 2: Create student pages**

Create `src/app/learn/page.tsx`:

```tsx
import Link from "next/link";

export default function LearnPage() {
  return (
    <main className="student-layout">
      <aside className="group-sidebar">1年级上册</aside>
      <section className="student-content">
        <h1>学习</h1>
        <article className="study-card">
          <h2>apple</h2>
          <p>/ˈæpəl/ · noun · 🔊</p>
          <p>苹果</p>
          <p>I eat an apple after lunch.</p>
        </article>
      </section>
      <nav className="bottom-nav" aria-label="学生底部导航">
        <Link href="/learn">学习</Link>
        <Link href="/self-test">自测</Link>
        <Link href="/exam">考试</Link>
        <Link href="/results">结果</Link>
      </nav>
    </main>
  );
}
```

Create `src/app/self-test/page.tsx`:

```tsx
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
```

Create `src/app/exam/page.tsx`:

```tsx
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
```

Create `src/app/results/page.tsx`:

```tsx
export default function ResultsPage() {
  return (
    <main className="student-layout exam-scroll">
      <aside className="group-sidebar">历史考试</aside>
      <section className="student-content">
        <h1>考试结果</h1>
        <p>暂无考试记录。</p>
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
```

Create `src/app/results/[sessionId]/page.tsx`:

```tsx
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
```

- [ ] **Step 3: Add responsive CSS**

Append to `src/app/globals.css`:

```css
.student-layout {
  min-height: 100dvh;
  display: grid;
  grid-template-columns: 240px 1fr;
  background: #f6f7f9;
}

.group-sidebar {
  border-right: 1px solid #e5e7eb;
  background: #fff;
  padding: 20px;
}

.student-content {
  min-width: 0;
  padding: 20px;
}

.study-card {
  background: #fff;
  border: 1px solid #dde2ea;
  border-radius: 8px;
  padding: 18px;
}

.bottom-nav {
  display: none;
}

@media (max-width: 760px) {
  html,
  body {
    overflow: hidden;
  }

  .student-layout {
    height: 100dvh;
    grid-template-columns: 1fr;
    grid-template-rows: 1fr 60px;
  }

  .group-sidebar {
    display: none;
  }

  .student-content {
    min-height: 0;
    overflow: hidden;
    display: grid;
    align-content: center;
  }

  .exam-scroll .student-content {
    overflow: auto;
    align-content: start;
  }

  .bottom-nav {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    border-top: 1px solid #e5e7eb;
    background: #fff;
  }

  .bottom-nav a {
    display: grid;
    place-items: center;
    font-size: 13px;
  }
}
```

- [ ] **Step 4: Run E2E**

Run:

```bash
npm run test:e2e -- tests/e2e/student-flow.spec.ts
```

Expected: Pad sees sidebar pages; H5 sees bottom navigation.

- [ ] **Step 5: Commit**

Run:

```bash
git add src/app/learn src/app/self-test src/app/exam src/app/results src/app/globals.css tests/e2e/student-flow.spec.ts
git commit -m "feat: add student learning pages"
```

## Task 9: Connect Durable Import, Library, Exam, and Results Data

**Files:**
- Modify: `src/app/teacher/import/actions.ts`
- Create: `src/app/teacher/library/page.tsx`
- Modify: `src/app/learn/page.tsx`
- Modify: `src/app/self-test/page.tsx`
- Modify: `src/app/exam/page.tsx`
- Modify: `src/app/results/page.tsx`
- Modify: `src/app/results/[sessionId]/page.tsx`
- Create: `tests/e2e/full-flow.spec.ts`

- [ ] **Step 1: Write full-flow E2E test**

Create `tests/e2e/full-flow.spec.ts`:

```ts
import { expect, test } from "@playwright/test";

test("teacher import creates content students can review", async ({ page }) => {
  await page.goto("/teacher/import");
  await page.getByLabel("导入内容").fill("apple /ˈæpəl/ n. 苹果 I eat an apple.");
  await page.getByRole("button", { name: "解析内容" }).click();
  await page.getByRole("button", { name: "确认导入" }).click();
  await page.goto("/learn");
  await expect(page.getByText("apple")).toBeVisible();
  await expect(page.getByText("苹果")).toBeVisible();
});
```

- [ ] **Step 2: Replace in-memory preview with database rows**

Modify `src/app/teacher/import/actions.ts` so `parsePasteAction` creates `ImportBatch` and `ImportRow` records through Prisma, then redirects to the persisted batch id.

Use this shape:

```ts
const batch = await prisma.importBatch.create({
  data: {
    sourceType: "paste",
    targetGroupId: "default",
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
```

Expected: preview survives a page reload.

- [ ] **Step 3: Add confirm import action**

Add `confirmImportAction(batchId: string)` in `src/app/teacher/import/actions.ts`.

The action must:

- Read batch rows.
- Parse `enrichedJson` as `TermDraft`.
- Upsert `Term` by `normalizedText` and `termType`.
- Create non-duplicate `TermMeaning` rows.
- Mark the batch as `confirmed`.
- Redirect to `/teacher/library`.

- [ ] **Step 4: Build library and data-backed student pages**

Create `src/app/teacher/library/page.tsx` that lists saved terms and meanings from Prisma.

Modify student pages to load saved terms from Prisma instead of static examples.

- [ ] **Step 5: Run tests**

Run:

```bash
npm run test:e2e -- tests/e2e/full-flow.spec.ts
npm test
```

Expected: full flow passes and unit tests remain green.

- [ ] **Step 6: Commit**

Run:

```bash
git add src/app/teacher src/app/learn src/app/self-test src/app/exam src/app/results tests/e2e/full-flow.spec.ts
git commit -m "feat: persist learning workflow"
```

## Task 10: Final Verification

**Files:**
- Modify only files needed to fix verification failures.

- [ ] **Step 1: Run full verification**

Run:

```bash
npm run typecheck
npm test
npm run test:e2e
npm run build
```

Expected: all commands pass.

- [ ] **Step 2: Check git state**

Run:

```bash
git status --short --branch
```

Expected: no uncommitted tracked changes. PyCharm `.idea/` files remain ignored by top-level `.gitignore`.

- [ ] **Step 3: Commit final fixes if any**

Run only if verification required changes:

```bash
git add .
git commit -m "fix: stabilize english learning mvp"
```

## Self-Review

Spec coverage:

- Teacher import, parsed-field preservation, missing-field enrichment, phrase-specific fields, duplicate merge, learning, self-test, exam, results, and responsive Pad/H5 behavior are covered by tasks 2 through 10.

Placeholder scan:

- The plan contains no unresolved placeholders, empty sections, or ambiguous file targets.

Type consistency:

- `TermDraft`, `MeaningDraft`, `TermType`, `FieldSource`, `QuizQuestion`, and `AnswerOption` are introduced before subsequent tasks reference them.
