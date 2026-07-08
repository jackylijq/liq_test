# Teacher Category Workbench Design

## Goal

Update the teacher entry so it opens a category-centered workbench instead of a standalone import form. Teachers should see the default grade outline, select a category, upload or paste files inside that category, and review the category content split into words and phrases.

## Scope

This design covers the teacher-side workflow only:

- `/teacher` becomes the teacher entry page.
- The page shows the default category outline from `Group`.
- Selecting a category shows that category's words, phrases, upload form, and enrichment status.
- PDF, Word, TXT, and pasted text imports are scoped to the selected category.
- Existing imported fields are preserved.
- Missing Chinese meanings, example sentences, explanations, or phrase usage contexts are filled through the enrichment provider.
- Baidu lookup is represented as a provider boundary, not direct scraping in this iteration.

Student learning, self-test, exam generation, and result review behavior stay unchanged except that they continue to consume the same `Group`, `Term`, and `TermMeaning` data.

## User Experience

The home page teacher entry links to `/teacher`. The teacher workbench uses a two-column layout on desktop and tablet:

- Left column: category outline, ordered by `sortOrder`, starting with the default grade groups such as `1年级上册`, `1年级下册`, through `6年级下册`.
- Right column: selected category workspace.

The right workspace contains:

1. Category summary with word count, phrase count, and missing-field count.
2. Category-scoped upload and paste form.
3. Content tabs for `单词` and `短语`.

Clicking a category changes the selected category. The selected category id is passed through the route or query string so import actions and content queries always use the same target group.

## Content Rules

Words display:

- English text.
- Phonetic symbol when available.
- Part of speech.
- Chinese meanings.
- Example sentence.
- Explanation.

Phrases display:

- English phrase or fixed expression.
- Chinese meaning.
- Example sentence.
- Common usage context.

Phrases do not display or require phonetic symbols or part of speech. The enrichment layer must preserve this rule even when imported data is incomplete.

## Import And Merge Flow

When a teacher uploads or pastes content in a category:

1. Parse the source into `TermDraft` rows.
2. Enrich each row only where fields are missing.
3. Create an `ImportBatch` with `targetGroupId` set to the selected category.
4. Show the existing preview page.
5. On confirmation, upsert `Term` by `normalizedText` and `termType`.
6. Upsert the `TermGroup` link for the selected category.
7. Add new meanings that do not already exist for the term.
8. Ignore exact duplicate meanings.

This preserves existing duplicate handling while making the target category explicit.

## Enrichment Design

The existing enrichment provider remains the single entry point for auto-completion. The provider should support three source levels:

- Parsed fields: data already present in the uploaded file.
- Generated fields: local or AI-generated fallback values.
- Web lookup fields: future Baidu or search API summaries.

In this iteration, the app uses the existing local or OpenAI-backed enrichment behavior and records generated field sources. A Baidu provider interface can be added behind the same provider boundary later. The teacher import flow must not depend on direct Baidu scraping, because search result HTML, network access, and anti-bot behavior are unstable.

## Data Model Impact

No required Prisma schema migration is expected.

Existing models already support this workflow:

- `Group` stores the grade outline.
- `Term` stores words and phrases via `termType`.
- `TermGroup` links terms to categories.
- `TermMeaning` stores Chinese meaning, example sentence, explanation, usage context, and field sources.
- `ImportBatch.targetGroupId` stores the selected import category.

If a later Baidu provider needs audit detail beyond `fieldSourcesJson`, that should be handled in a separate design.

## Error Handling

The teacher workbench should handle:

- No groups: create or link to the seeded default group behavior already present in the app.
- No selected category: fall back to the first ordered group.
- Empty import input: keep the teacher on the selected category and show a validation state instead of creating an empty batch.
- Parse failure: show an actionable error state and keep the selected category.
- Enrichment failure: fall back to local mock generation so import can continue.
- Empty category content: show an empty state under the selected `单词` or `短语` tab.

## Testing

Add or update focused tests:

- Unit coverage for category-scoped import target selection.
- Unit coverage that phrase enrichment does not add phonetic symbols or part of speech.
- E2E coverage that `/teacher` shows the default category outline.
- E2E coverage that importing from a selected category stores terms under that category.
- E2E coverage that category content is split into `单词` and `短语`.

Existing typecheck, unit tests, and the teacher import e2e test must pass after implementation.

## Out Of Scope

- Direct Baidu search scraping.
- User authentication and role permissions.
- Category creation, deletion, or drag sorting.
- Manual editing of individual term meanings.
- Student UI redesign.
