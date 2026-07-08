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
