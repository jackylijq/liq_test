import { expect, test } from "@playwright/test";
import path from "node:path";

test("teacher can import pasted text and see preview", async ({ page }) => {
  await page.goto("/teacher/import");
  await page.getByLabel("导入内容").fill("apple /ˈæpəl/ n. 苹果 I eat an apple.");
  await page.getByRole("button", { name: "解析内容" }).click();
  await expect(page.getByText("apple")).toBeVisible();
  await expect(page.getByText("苹果")).toBeVisible();
});

test("teacher can import an uploaded file and see preview", async ({ page }) => {
  await page.goto("/teacher/import");
  await page
    .getByLabel("上传 PDF / Word 文件")
    .setInputFiles(path.join(process.cwd(), "tests/fixtures/import-sample.txt"));
  await page.getByRole("button", { name: "解析内容" }).click();
  await expect(page.getByText("banana")).toBeVisible();
  await expect(page.getByText("香蕉")).toBeVisible();
});

test("preview rows with duplicate text do not emit duplicate key warnings", async ({ page }) => {
  const consoleErrors: string[] = [];
  page.on("console", (message) => {
    if (message.type() === "error") {
      consoleErrors.push(message.text());
    }
  });

  await page.goto("/teacher/import");
  await page.getByLabel("导入内容").fill("-\n-");
  await page.getByRole("button", { name: "解析内容" }).click();
  await expect(page.getByRole("heading", { name: "导入预览" })).toBeVisible();
  expect(consoleErrors.join("\n")).not.toContain("Encountered two children with the same key");
});
