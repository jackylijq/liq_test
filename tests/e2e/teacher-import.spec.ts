import { expect, test } from "@playwright/test";
import path from "node:path";

test("teacher entry shows default category outline", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("link", { name: "老师入口" }).click();
  await expect(page).toHaveURL(/\/teacher/);
  await expect(page.getByRole("heading", { name: "老师工作台" })).toBeVisible();
  await expect(page.getByRole("link", { name: "1年级上册" })).toBeVisible();
  await expect(page.getByRole("link", { name: "6年级下册" })).toBeVisible();
  await expect(page.getByRole("link", { name: "9年级下册" })).toBeVisible();
  await expect(page.getByRole("link", { name: "新增内容" })).toBeVisible();
  await expect(page.getByRole("button", { name: "解析到当前分类" })).toHaveCount(0);
});

test("teacher can import pasted text and see preview", async ({ page }) => {
  await page.goto("/teacher/import");
  await page.getByLabel("粘贴 MD/TXT 导入内容").fill("apple /ˈæpəl/ n. 苹果 I eat an apple.");
  await page.getByRole("button", { name: "解析到当前分类" }).click();
  await expect(page.getByRole("heading", { name: "导入预览" })).toBeVisible();
  await expect(page.getByText("目标分类：1年级上册")).toBeVisible();
  await expect(page.getByText("apple", { exact: true })).toBeVisible();
  await expect(page.getByText("苹果")).toBeVisible();
});

test("teacher can import an uploaded file and see preview", async ({ page }) => {
  await page.goto("/teacher/import");
  await page
    .getByLabel("上传 MD/TXT 新增词条，或 PDF/Word 补充匹配")
    .setInputFiles(path.join(process.cwd(), "tests/fixtures/import-sample.txt"));
  await page.getByRole("button", { name: "解析到当前分类" }).click();
  await expect(page.getByText("banana")).toBeVisible();
  await expect(page.getByText("香蕉")).toBeVisible();
});

test("teacher shows phrase meaning directly below English without usage context", async ({ page }) => {
  await page.goto("/teacher/import");
  await page.getByLabel("粘贴 MD/TXT 导入内容").fill("be good for 对有好处");
  await page.getByRole("button", { name: "解析到当前分类" }).click();
  await page.getByRole("button", { name: "确认导入" }).click();

  const card = page.locator(".teacher-term-card").filter({ hasText: "be good for" });
  await expect(card.locator("strong", { hasText: "be good for" })).toBeVisible();
  await expect(card.getByText("对有好处", { exact: true })).toBeVisible();
  await expect(card.getByText("常用场景")).toHaveCount(0);
});

test("teacher can import into a selected category and view split content", async ({ page }) => {
  await page.goto("/teacher");
  await page.getByRole("link", { name: "2年级上册" }).click();
  await expect(page.getByRole("heading", { name: "2年级上册" })).toBeVisible();
  await page.getByRole("link", { name: "新增内容" }).click();
  await expect(page.getByRole("heading", { name: "2年级上册" })).toBeVisible();
  await page.getByLabel("粘贴 MD/TXT 导入内容").fill("look after 照顾 She looks after her brother.");
  await page.getByRole("button", { name: "解析到当前分类" }).click();
  await expect(page.getByText("目标分类：2年级上册")).toBeVisible();
  await page.getByRole("button", { name: "确认导入" }).click();

  await expect(page.getByRole("heading", { name: "2年级上册" })).toBeVisible();
  await expect(page.getByText("look after", { exact: true })).toBeVisible();
  await expect(page.getByText("常用场景")).toHaveCount(0);
});

test("teacher markdown import renders units and section filters in the main pane", async ({ page }) => {
  const unitName = `Unit 1 Animal Friends ${Date.now()}`;
  await page.goto("/teacher/import");
  await page.getByLabel("粘贴 MD/TXT 导入内容").fill(`# Test Book

## ${unitName}

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

#### 必会词块
- stay safe
`);
  await page.getByRole("button", { name: "解析到当前分类" }).click();
  await page.getByRole("button", { name: "确认导入" }).click();

  await expect(page.getByLabel("分类大纲").getByRole("link", { name: unitName })).toHaveCount(0);
  await page.getByLabel("单元筛选").getByRole("link", { name: unitName, exact: true }).click();
  await expect(page.getByRole("heading", { name: unitName })).toBeVisible();
  await expect(page.getByRole("link", { name: "Section A-重点词汇", exact: true })).toBeVisible();
  await expect(page.getByRole("link", { name: "Section A-词性变化", exact: true })).toBeVisible();
  await expect(page.getByRole("link", { name: "Section A-必会词块", exact: true })).toBeVisible();
  await expect(page.getByRole("link", { name: "Section A-重点句型", exact: true })).toBeVisible();
  await expect(page.getByRole("link", { name: "Section B-必会词块", exact: true })).toBeVisible();
  await expect(page.getByText("fox", { exact: true })).toBeVisible();
  await expect(page.getByText("take care of", { exact: true })).toBeVisible();
  await expect(page.locator(".teacher-term-card strong").getByText("I like the way they walk.", { exact: true })).toBeVisible();

  await page.getByRole("link", { name: "Section A-重点词汇", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Section A-重点词汇" })).toBeVisible();
  await expect(page.getByLabel("单元筛选").getByRole("link", { name: unitName, exact: true })).toHaveClass(/active/);
  await expect(page.getByRole("link", { name: "Section A-重点词汇", exact: true })).toHaveClass(/active/);
  await expect(page.getByText("fox", { exact: true })).toBeVisible();
  await expect(page.getByText("take care of", { exact: true })).toHaveCount(0);
  await expect(page.getByText("I like the way they walk.", { exact: true })).toHaveCount(0);
});

test("preview rows do not emit duplicate key warnings", async ({ page }) => {
  const consoleErrors: string[] = [];
  page.on("console", (message) => {
    if (message.type() === "error") {
      consoleErrors.push(message.text());
    }
  });

  await page.goto("/teacher/import");
  await page.getByLabel("粘贴 MD/TXT 导入内容").fill("apple 苹果\nbanana 香蕉");
  await page.getByRole("button", { name: "解析到当前分类" }).click();
  await expect(page.getByRole("heading", { name: "导入预览" })).toBeVisible();
  expect(consoleErrors.join("\n")).not.toContain("Encountered two children with the same key");
});
