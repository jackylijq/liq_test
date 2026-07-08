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
