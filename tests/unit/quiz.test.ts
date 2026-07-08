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
