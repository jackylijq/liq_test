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
    explanation:
      term.termType === "phrase"
        ? (meaning.usageContext ?? meaning.exampleSentence ?? meaning.chineseMeaning)
        : (meaning.explanation ?? meaning.exampleSentence ?? meaning.chineseMeaning),
    termSnapshot: term,
  };
}
