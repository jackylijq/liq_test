import { expect, test } from "@playwright/test";

test("student navigation exposes learn, self-test, exam, and results", async ({ page }) => {
  await page.goto("/learn");
  await expect(page.getByRole("heading", { name: "学习" })).toBeVisible();
  await page.goto("/self-test");
  await expect(page.getByRole("heading", { name: "自测" })).toBeVisible();
  await page.goto("/exam");
  await expect(page.getByRole("heading", { name: "考试" })).toBeVisible();
  await page.goto("/results");
  await expect(page.getByRole("heading", { name: "考试结果" })).toBeVisible();
});

test("h5 layout shows bottom navigation", async ({ page, isMobile }) => {
  test.skip(!isMobile, "H5-only assertion");
  await page.goto("/learn");
  await expect(page.getByRole("navigation", { name: "学生底部导航" })).toBeVisible();
});

test("learn page uses grade unit and section filters", async ({ page }) => {
  const unitName = `Unit 1 Learn ${Date.now()}`;

  await page.goto("/teacher/import");
  await page.getByLabel("粘贴 MD/TXT 导入内容").fill(`# Learn Fixture

## ${unitName}

### Section A 基础过关

#### 重点词汇
- tiger n. 老虎

#### 必会词块
- look after 照顾

#### 重点句型
- Tigers can run fast.
`);
  await page.getByRole("button", { name: "解析到当前分类" }).click();
  await page.getByRole("button", { name: "确认导入" }).click();

  await page.goto("/learn");
  await expect(page.getByRole("heading", { name: "学习" })).toBeVisible();
  await page.getByRole("link", { name: unitName, exact: true }).click();
  await expect(page.getByRole("heading", { name: unitName })).toBeVisible();
  await expect(page.getByText("tiger", { exact: true })).toBeVisible();
  await expect(page.getByText("look after", { exact: true })).toBeVisible();
  await expect(page.getByText("Tigers can run fast.", { exact: true })).toBeVisible();

  await page.getByRole("link", { name: "Section A-重点词汇", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Section A-重点词汇" })).toBeVisible();
  await expect(page.getByText("tiger", { exact: true })).toBeVisible();
  await expect(page.getByText("look after", { exact: true })).toHaveCount(0);
});
