import { expect, test } from "@playwright/test";

test("teacher import creates content students can review", async ({ page }) => {
  const term = `codexapple${Date.now()}`;
  await page.goto("/teacher");
  await page.getByLabel("粘贴导入内容").fill(`${term} n. 测试词 I use ${term}.`);
  await page.getByRole("button", { name: "解析到当前分类" }).click();
  await page.getByRole("button", { name: "确认导入" }).click();
  await expect(page.getByRole("heading", { name: "1年级上册" })).toBeVisible();
  const importedCard = page.locator(".teacher-term-card").filter({ hasText: term });
  await expect(importedCard.getByText(term, { exact: true })).toBeVisible();
  await expect(importedCard.getByText("测试词", { exact: true }).first()).toBeVisible();

  await page.goto("/learn");
  await expect(page.getByRole("heading", { name: "学习" })).toBeVisible();
  await expect(page.locator(".study-card")).toBeVisible();
});
