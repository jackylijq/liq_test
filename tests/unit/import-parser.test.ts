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

  it("parses loose multi-line word blocks with phonetics and meanings", () => {
    const rows = parseImportedText(`care
/care/
noun
n.：照顾; 小心; 忧虑

v.：照顾; 关心; 担心; 喜爱`);

    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({
      text: "care",
      termType: "word",
      phoneticSymbol: "/care/",
    });
    expect(rows[0].meanings[0]).toMatchObject({
      partOfSpeech: "noun",
      chineseMeaning: "照顾",
    });
  });

  it("parses textbook markdown by section without treating headings as terms", () => {
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
      { text: "fox — (复数) foxes", type: "sentence", pos: undefined },
      { text: "come from", type: "phrase", pos: undefined },
      { text: "—Why do you like penguins so much? —Because they are very cute!", type: "sentence", pos: undefined },
      { text: "They can't fly like other birds, but they can swim very fast.", type: "sentence", pos: undefined },
      { text: "save", type: "word", pos: "verb" },
      { text: "luck", type: "word", pos: "noun" },
      { text: "however", type: "word", pos: "adverb" },
      { text: "Thai", type: "word", pos: "adjective/noun" },
    ]);
    expect(rows.map((row) => row.text)).not.toContain("####");
  });

  it("keeps textbook markdown unit and section category paths on imported terms", () => {
    const rows = parseImportedText(`# 武汉市光谷实验中学七年级英语校本教材

## Unit 1 Animal Friends

### Section A 基础过关

#### 重点词汇
- fox n.

#### 词性变化
- fox — (复数) foxes

#### 必会词块
- take care of

#### 重点句型
- I like the way they walk.

### Section B 基础过关

#### 重点单词
- save
`);

    expect(rows.map((row) => ({ text: row.text, categoryPath: row.categoryPath }))).toEqual([
      { text: "fox", categoryPath: ["Unit 1 Animal Friends", "Section A 基础过关 - 重点词汇"] },
      { text: "fox — (复数) foxes", categoryPath: ["Unit 1 Animal Friends", "Section A 基础过关 - 词性变化"] },
      { text: "take care of", categoryPath: ["Unit 1 Animal Friends", "Section A 基础过关 - 必会词块"] },
      { text: "I like the way they walk.", categoryPath: ["Unit 1 Animal Friends", "Section A 基础过关 - 重点句型"] },
      { text: "save", categoryPath: ["Unit 1 Animal Friends", "Section B 基础过关 - 重点单词"] },
    ]);
  });

  it("parses compact PDF textbook extraction without importing headings or sentence rows", () => {
    const rows = parseImportedText(`武汉市光谷实验中学七年级英语校本教材
Unit1AnimalFriends
SectionA基础过关
重点词汇
1.foxn.狐狸
6.caren.照顾；护理v.关心；在乎
7.takecareof照顾；处理
-词性变化
1.fox—(复数)foxes
必会词块
1.照顾；处理takecareof
2.来自comefrom
3.putup/raiseone’shand举手
4.makesb’sbed
重点句型
1.--“你为什么这么喜欢企鹅？”
-Whydoyoulikepenguinsso
much?
-Becausetheyareverycute!
SectionB基础过关
重点单词
-Verb动词
1.教；储蓄；保存save
-Noun名词
7.幸运；运气luck
-Adverb副词
20.然而；不过however
-多重词性词
22.adj.泰国的；泰国人的n.泰国人；
泰语Thai
`);

    expect(rows.map((row) => ({ text: row.text, type: row.termType, pos: row.meanings[0]?.partOfSpeech, meaning: row.meanings[0]?.chineseMeaning }))).toEqual([
      { text: "fox", type: "word", pos: "noun", meaning: "狐狸" },
      { text: "care", type: "word", pos: "noun", meaning: "照顾；护理" },
      { text: "take care of", type: "phrase", pos: undefined, meaning: "照顾；处理" },
      { text: "come from", type: "phrase", pos: undefined, meaning: "来自" },
      { text: "put up/raise one's hand", type: "phrase", pos: undefined, meaning: "举手" },
      { text: "make sb's bed", type: "phrase", pos: undefined, meaning: "" },
      { text: "save", type: "word", pos: "verb", meaning: "教；储蓄；保存" },
      { text: "luck", type: "word", pos: "noun", meaning: "幸运；运气" },
      { text: "however", type: "word", pos: "adverb", meaning: "然而；不过" },
      { text: "Thai", type: "word", pos: undefined, meaning: "泰语" },
    ]);
    expect(rows.some((row) => row.text.includes("武汉市"))).toBe(false);
    expect(rows.some((row) => row.text.includes("Unit1"))).toBe(false);
    expect(rows.some((row) => row.text.includes("词性变化"))).toBe(false);
    expect(rows.some((row) => row.text.includes("22.adj"))).toBe(false);
    expect(rows.some((row) => row.text.includes("Why"))).toBe(false);
    const care = rows.find((row) => row.text === "care");
    expect(care?.meanings).toMatchObject([
      { partOfSpeech: "noun", chineseMeaning: "照顾；护理" },
      { partOfSpeech: "verb", chineseMeaning: "关心；在乎" },
    ]);
  });

  it("parses PDF-style sentence and phrase translations from extracted text", () => {
    const rows = parseImportedText(`必会词块
1.takecareof照顾；处理
重点句型
1.I like the way they walk. 我喜欢它们走路的方式。
2.你为什么这么喜欢企鹅？ Why do you like penguins so much?
`);

    expect(rows.map((row) => ({ text: row.text, type: row.termType, meaning: row.meanings[0]?.chineseMeaning }))).toEqual([
      { text: "take care of", type: "phrase", meaning: "照顾；处理" },
      { text: "I like the way they walk.", type: "sentence", meaning: "我喜欢它们走路的方式" },
      { text: "Why do you like penguins so much?", type: "sentence", meaning: "你为什么这么喜欢企鹅" },
    ]);
  });

  it("parses a pasted bare English sentence as a sentence", () => {
    const rows = parseImportedText("I have to hurry to school because I can’t be late for school.");

    expect(rows).toMatchObject([
      {
        text: "I have to hurry to school because I can’t be late for school.",
        termType: "sentence",
        meanings: [
          {
            chineseMeaning: "",
            exampleSentence: "I have to hurry to school because I can’t be late for school.",
          },
        ],
      },
    ]);
  });

  it("splits common compact textbook phrase rows from PDF extraction", () => {
    const rows = parseImportedText(`必会词块
23.是......的象征beasymbolof
25.拿起；举起pickup
26.在某种程度上inaway
27.喜爱做某事enjoydoingsomething
29.互相oneanother
33.砍伐；减少cutdown
34.太多toomuch
`);

    expect(rows.map((row) => ({ text: row.text, meaning: row.meanings[0]?.chineseMeaning, type: row.termType }))).toEqual([
      { text: "be a symbol of", meaning: "是的象征", type: "phrase" },
      { text: "pick up", meaning: "拿起；举起", type: "phrase" },
      { text: "in a way", meaning: "在某种程度上", type: "phrase" },
      { text: "enjoy doing something", meaning: "喜爱做某事", type: "phrase" },
      { text: "one another", meaning: "互相", type: "phrase" },
      { text: "cut down", meaning: "砍伐；减少", type: "phrase" },
      { text: "too much", meaning: "太多", type: "phrase" },
    ]);
  });
});
