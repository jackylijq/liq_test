export type TermType = "word" | "phrase";
export type FieldSource = "parsed" | "ai_generated" | "mock_generated" | "edited";

export type MeaningFieldName =
  | "partOfSpeech"
  | "chineseMeaning"
  | "exampleSentence"
  | "explanation"
  | "usageContext";

export type MeaningDraft = {
  partOfSpeech?: string;
  chineseMeaning: string;
  exampleSentence?: string;
  explanation?: string;
  usageContext?: string;
  fieldSources: Partial<Record<MeaningFieldName, FieldSource>>;
};

export type TermDraft = {
  text: string;
  normalizedText?: string;
  termType: TermType;
  phoneticSymbol?: string;
  meanings: MeaningDraft[];
};
