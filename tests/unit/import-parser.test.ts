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

  it("parses textbook markdown by section instead of treating headings and sentences as terms", () => {
    const rows = parseImportedText(`# 七年级英语校本教材

#### 重点词汇
- fox n.
- care n. v.
- take care of

#### 词性变化
- fox — (复数) foxes

#### 必会词块
- take care of
- come from

#### 重点句型
- —Why do you like penguins so much? —Because they are very cute!
- They can't fly like other birds, but they can swim very fast.

#### 重点单词
**Verb 动词**
- save
**Noun 名词**
- luck
**Adverb 副词**
- however
**多重词性词**
- Thai adj. n.

---
`);

    expect(rows.map((row) => ({ text: row.text, type: row.termType, pos: row.meanings[0]?.partOfSpeech }))).toEqual([
      { text: "fox", type: "word", pos: "noun" },
      { text: "care", type: "word", pos: "noun/verb" },
      { text: "take care of", type: "phrase", pos: undefined },
      { text: "come from", type: "phrase", pos: undefined },
      { text: "save", type: "word", pos: "verb" },
      { text: "luck", type: "word", pos: "noun" },
      { text: "however", type: "word", pos: "adverb" },
      { text: "Thai", type: "word", pos: "adjective/noun" },
    ]);
    expect(rows.map((row) => row.text)).not.toContain("####");
    expect(rows.map((row) => row.text)).not.toContain("fox —");
    expect(rows.some((row) => row.text.includes("Why do you like penguins"))).toBe(false);
  });
});
