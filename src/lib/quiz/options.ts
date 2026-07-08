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
