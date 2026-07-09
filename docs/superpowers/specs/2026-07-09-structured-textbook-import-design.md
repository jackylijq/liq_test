# Structured Textbook Import Design

## Goal

Improve textbook imports so教材结构 becomes page-level filters instead of accidental word entries. The importer should first extract English words and phrases from the textbook structure, generate a normalized Markdown preview, and then import only valid word and phrase rows into the selected teacher category.

## Problem

The current parser can avoid some Markdown headings, but it still treats the source mainly as lines. For教材 such as `武汉市光谷实验中学七年级英语校本教材`, the important information is structural:

- The textbook title identifies the grade-level category.
- `## Unit 1 Animal Friends` identifies the first page-level filter.
- `### Section A 基础过关` plus `#### 重点词汇` identifies the second page-level filter.
- Only rows under vocabulary and phrase buckets should become importable terms.

Text such as the textbook title, Unit title, Section title, `重点词汇`, `词性变化`, and `重点句型` must never become words.

## Scope

This design covers teacher-side import parsing, preview, persistence, and teacher-library filtering.

In scope:

- Parse Markdown教材 into structured textbook sections.
- Generate normalized Markdown as an intermediate output for tests and preview.
- Import words and phrases with Unit and Section bucket metadata.
- Add page-level teacher filters:
  - First layer: Unit.
  - Second layer: `Section + bucket heading`.
- Preserve the existing word/phrase tabs.
- Keep enrichment behavior for missing Chinese meanings, example sentences, and phrase usage contexts.

Out of scope:

- Student-side Unit/Section filtering.
- Editing Unit or Section labels manually.
- Importing sentence patterns as exam questions.
- Persisting `词性变化` as standalone learning content.
- Direct Baidu scraping.

## Parsing Model

The textbook parser should produce a structured intermediate representation:

```ts
type TextbookImport = {
  title: string;
  suggestedGroupName?: string;
  units: Array<{
    unitName: string;
    sections: Array<{
      sectionName: string;
      buckets: Array<{
        bucketName: string;
        filterLabel: string;
        kind: "word" | "phrase" | "ignore";
        items: Array<{
          text: string;
          termType: "word" | "phrase";
          partOfSpeech?: string;
          rawText: string;
        }>;
      }>;
    }>;
  }>;
};
```

Rules:

- `# 武汉市光谷实验中学七年级英语校本教材` maps to `suggestedGroupName = "7年级上册"` unless the teacher has already selected a category. The selected category remains authoritative.
- `## Unit 1 Animal Friends` becomes `unitName`.
- `### Section A 基础过关` becomes `sectionName`.
- `#### 重点词汇`, `#### 重点单词`, and equivalent headings create word buckets.
- `#### 必会词块`, `#### 重点短语`, and equivalent headings create phrase buckets.
- `#### 词性变化`, `#### 词形变化`, `#### 词形转换`, and equivalent headings create ignored buckets.
- `#### 重点句型`, `#### 常考句型`, `#### 重点句式`, and equivalent headings create ignored buckets.
- `**Verb 动词**`, `**Noun 名词**`, `**Adjective 形容词**`, and `**Adverb 副词**` apply part of speech to following word rows inside a word bucket.
- `**多重词性词**` clears the inherited part of speech, allowing inline parts such as `Thai adj. n.` to be parsed.

## Normalized Markdown

Before converting to `TermDraft`, the parser must be able to render normalized Markdown. Tests should compare this output against expected Markdown for the supplied教材 sample.

Format:

```md
# 7年级上册

## Unit 1 Animal Friends

### Section A 基础过关 - 重点词汇
- word: fox
  pos: noun
- word: care
  pos: noun/verb

### Section A 基础过关 - 必会词块
- phrase: take care of
- phrase: come from
```

The normalized Markdown must not include:

- The original school/textbook title as a term.
- Unit headings as terms.
- Section headings as terms.
- Bucket headings as terms.
- Sentence-pattern rows.
- Word-form-change rows.

## Persistence

Keep `TermGroup` as the grade/category membership table and add a separate placement table for page-level filters:

```prisma
model TermPlacement {
  id          String @id @default(cuid())
  termId      String
  groupId     String
  unitName    String
  sectionName String
  bucketName  String
  filterLabel String
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  term  Term  @relation(fields: [termId], references: [id], onDelete: Cascade)
  group Group @relation(fields: [groupId], references: [id], onDelete: Cascade)

  @@unique([termId, groupId, unitName, filterLabel])
}
```

This keeps the existing `TermGroup` behavior for grade membership and allows the same term to appear in multiple Units or Section buckets within the same grade category.

`ImportRow.parsedJson` and `ImportRow.enrichedJson` should include the placement metadata for preview and confirmation:

```ts
type TermDraftPlacement = TermDraft & {
  unitName?: string;
  sectionName?: string;
  bucketName?: string;
  filterLabel?: string;
};
```

## Teacher Page Filtering

Inside the selected grade category page:

- Show a Unit filter above the word/phrase tabs.
- When a Unit is selected, show second-layer filter chips for that Unit:
  - `Section A 基础过关 - 重点词汇`
  - `Section A 基础过关 - 必会词块`
  - `Section B 基础过关 - 重点单词`
  - `Section B 基础过关 - 必会词块`
- `全部` remains available at both layers.
- Existing `单词 / 短语` tabs remain unchanged and apply after Unit/Section filters.

The teacher page query parameters should use stable values:

- `unit=Unit%201%20Animal%20Friends`
- `filter=Section%20A%20基础过关%20-%20重点词汇`
- `tab=word | phrase`

## Import Flow

1. Teacher selects grade category, such as `7年级上册`.
2. Teacher uploads or pastes Markdown/PDF/Word content.
3. Parser extracts structured教材 sections.
4. Parser renders normalized Markdown for preview/testing.
5. Parser converts valid word/phrase items to draft rows with placement metadata.
6. Enrichment fills missing Chinese meaning, example sentence, explanation, and phrase usage context.
7. Preview shows each row with type and placement label.
8. Confirmation upserts the term and writes `TermGroup` membership for the selected grade category.
9. Confirmation upserts `TermPlacement` for the selected Unit and Section bucket.
10. Teacher returns to the category page and can filter by Unit and Section bucket.

## Error Handling

- If no word or phrase rows are found, keep the teacher on the current category with an empty import error.
- If a row appears under an ignored bucket, it should be skipped without an error.
- If a word row has no part of speech, enrichment can fill it.
- If the教材 title suggests a category different from the selected teacher category, selected category wins.

## Testing

Add focused tests:

- Structured parser test for the first Unit of `七年级英语校本教材.md`.
- Normalized Markdown snapshot/string comparison for the same sample.
- Parser regression that these strings are not imported as terms:
  - `武汉市光谷实验中学七年级英语校本教材`
  - `Unit1AnimalFriends`
  - `SectionA基础过关`
  - `重点词汇`
  - `词性变化`
  - `重点句型`
- Persistence test or E2E assertion that imported terms carry Unit/filter metadata.
- Teacher page E2E showing Unit and second-layer filters.
- Existing teacher import, full flow, typecheck, and unit tests must still pass.
