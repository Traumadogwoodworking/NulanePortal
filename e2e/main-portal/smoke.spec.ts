import { expect, test } from "playwright/test";
import { configureApiMocks } from "../utils/apiMock";
import { capturePageIssues, clearDevSessionRole } from "../utils/surfaceHarness";

test("main portal shell and primary routes load cleanly", async ({ page }) => {
  const issues = capturePageIssues(page);
  await clearDevSessionRole(page);
  await configureApiMocks(page);

  await page.goto("/");
  await expect(page.getByRole("heading", { name: "Client Portal" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Control Portal" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Damage Reports" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Control Home", exact: true })).toBeVisible();
  await page.getByRole("link", { name: /Client Portal/ }).first().click();
  await expect(page).toHaveURL(/\/dashboard\/?$/);
  await page.goto("/");
  await page.getByRole("link", { name: /Control Portal/ }).first().click();
  await expect(page).toHaveURL(/\/control\/overview\/?$/);

  await page.goto("/dashboard");
  await expect(page.locator("#sidebar")).toBeVisible();
  await expect(page.getByText("Workflows")).toBeVisible();
  await expect(page.locator("article").getByRole("heading", { name: "Dashboards" })).toBeVisible();

  await page.goto("/reports/damage");
  await expect(page.locator("article").getByRole("heading", { name: "Damage Reports" })).toBeVisible();
  await expect(page.getByRole("columnheader", { name: "VIN" })).toBeVisible();
  await page.getByText("Atlas Rover").click();
  await expect(page.getByText("Visual artifacts")).toBeVisible();
  await page.getByRole("button", { name: "Open media 1" }).click();
  await expect(page.getByRole("button", { name: "Previous media" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Next media" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Download report photos" })).toBeVisible();
  await page.getByRole("button", { name: "Close media viewer" }).click();
  await page.getByText("Atlas Carrier").click();
  await expect(page.getByText("No gallery media is available for this report.")).toBeVisible();

  await page.goto("/reports/rsa");
  await expect(page.locator("article").getByRole("heading", { name: "RSA Reports" })).toBeVisible();
  await expect(page.getByText("RSA Logistics Summary")).toBeVisible();

  await page.goto("/docudent");
  await expect(page.getByText("Valad Dent inspection")).toBeVisible();
  await expect(page.getByText("Recent inspections")).toBeVisible();

  expect(issues).toEqual([]);
});
