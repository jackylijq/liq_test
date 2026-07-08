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
