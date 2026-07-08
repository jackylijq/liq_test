import { expect, test } from "@playwright/test";
import path from "node:path";

test("teacher entry shows default category outline", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("link", { name: "老师入口" }).click();
  await expect(page).toHaveURL(/\/teacher/);
  await expect(page.getByRole("heading", { name: "老师工作台" })).toBeVisible();
  await expect(page.getByRole("link", { name: "1年级上册" })).toBeVisible();
  await expect(page.getByRole("link", { name: "6年级下册" })).toBeVisible();
  await expect(page.getByRole("button", { name: "解析到当前分类" })).toBeVisible();
});

test("teacher can import pasted text and see preview", async ({ page }) => {
  await page.goto("/teacher");
  await page.getByLabel("粘贴导入内容").fill("apple /ˈæpəl/ n. 苹果 I eat an apple.");
  await page.getByRole("button", { name: "解析到当前分类" }).click();
  await expect(page.getByRole("heading", { name: "导入预览" })).toBeVisible();
  await expect(page.getByText("目标分类：1年级上册")).toBeVisible();
  await expect(page.getByText("apple", { exact: true })).toBeVisible();
  await expect(page.getByText("苹果")).toBeVisible();
});

test("teacher can import an uploaded file and see preview", async ({ page }) => {
  await page.goto("/teacher");
  await page
    .getByLabel("上传 PDF / Word / TXT 文件")
    .setInputFiles(path.join(process.cwd(), "tests/fixtures/import-sample.txt"));
  await page.getByRole("button", { name: "解析到当前分类" }).click();
  await expect(page.getByText("banana")).toBeVisible();
  await expect(page.getByText("香蕉")).toBeVisible();
});

test("teacher can import into a selected category and view split content", async ({ page }) => {
  await page.goto("/teacher");
  await page.getByRole("link", { name: "2年级上册" }).click();
  await expect(page.getByRole("heading", { name: "2年级上册" })).toBeVisible();
  await page.getByLabel("粘贴导入内容").fill("look after 照顾 She looks after her brother.");
  await page.getByRole("button", { name: "解析到当前分类" }).click();
  await expect(page.getByText("目标分类：2年级上册")).toBeVisible();
  await page.getByRole("button", { name: "确认导入" }).click();

  await expect(page.getByRole("heading", { name: "2年级上册" })).toBeVisible();
  await page.getByRole("link", { name: "短语" }).click();
  await expect(page.getByText("look after", { exact: true })).toBeVisible();
  await expect(page.getByText("常用场景")).toBeVisible();
});

test("preview rows with duplicate text do not emit duplicate key warnings", async ({ page }) => {
  const consoleErrors: string[] = [];
  page.on("console", (message) => {
    if (message.type() === "error") {
      consoleErrors.push(message.text());
    }
  });

  await page.goto("/teacher");
  await page.getByLabel("粘贴导入内容").fill("-\n-");
  await page.getByRole("button", { name: "解析到当前分类" }).click();
  await expect(page.getByRole("heading", { name: "导入预览" })).toBeVisible();
  expect(consoleErrors.join("\n")).not.toContain("Encountered two children with the same key");
});
