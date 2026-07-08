import { expect, test } from "@playwright/test";

test("teacher import creates content students can review", async ({ page }) => {
  await page.goto("/teacher/import");
  await page.getByLabel("导入内容").fill("apple /ˈæpəl/ n. 苹果 I eat an apple.");
  await page.getByRole("button", { name: "解析内容" }).click();
  await page.getByRole("button", { name: "确认导入" }).click();
  await page.goto("/learn");
  await expect(page.getByRole("heading", { name: "apple" })).toBeVisible();
  await expect(page.getByText("苹果")).toBeVisible();
});
