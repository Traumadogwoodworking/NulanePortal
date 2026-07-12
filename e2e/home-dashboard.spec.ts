import { expect, test } from "playwright/test";
import { homeDashboardAnalyticsFixture, homeDashboardReportListFixture } from "./fixtures/home-dashboard-fixture";

async function mockHomeDashboardApis(page: import("playwright/test").Page) {
  await page.route("**/dashboard/analytics**", async (route) => {
    await route.fulfill({ json: homeDashboardAnalyticsFixture });
  });
  await page.route("**/reports/list**", async (route) => {
    await route.fulfill({ json: homeDashboardReportListFixture });
  });
}

test.describe("home dashboard legacy visual parity", () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      (window as Window & { __PORTAL_DEV_SESSION_BYPASS__?: boolean }).__PORTAL_DEV_SESSION_BYPASS__ = true;
    });
    await mockHomeDashboardApis(page);
    await page.goto("/home?portalDevSession=admin");
    await expect(page.getByText("Total Damage Submissions", { exact: true })).toBeVisible();
  });

  test("renders the required legacy cards", async ({ page }) => {
    await expect(page.getByText("Total Damage Submissions", { exact: true })).toBeVisible();
    await expect(page.getByText(/Damaged Submissions/)).toBeVisible();
    await expect(page.getByRole("main").getByText("RSA Reports", { exact: true })).toBeVisible();
    await expect(page.getByText(/Daily Damage/)).toBeVisible();
    await expect(page.getByText("Severity Detail")).toBeVisible();
    await expect(page.getByText("Top Damage Areas")).toBeVisible();
    await expect(page.getByRole("heading", { name: "Inspector Damage Submissions" })).toBeVisible();
    await expect(page.getByRole("button", { name: /Export ZIP/i }).first()).toBeVisible();
  });

  test("clicking a severity item applies the shared severity filter", async ({ page }) => {
    await page.getByLabel("Severity").selectOption("6");
    await expect(page.getByText(/Applied/)).toBeVisible();
    await expect(page.getByText(/Severity: 6/)).toBeVisible();
    await expect(page).toHaveURL(/severity=6/);
  });

  test("clicking a damage area applies the shared damage area filter", async ({ page }) => {
    const areaCard = page
      .getByText("Top Damage Areas", { exact: true })
      .locator("xpath=ancestor::div[contains(@class,'overflow-hidden')][1]");
    await areaCard.locator(".recharts-pie-sector").first().click();
    await expect(page.getByText(/Applied/)).toBeVisible();
    await expect(page.getByText(/Damage area:/)).toBeVisible();
    await expect.poll(() => new URL(page.url()).searchParams.get("damage_area")).not.toBeNull();
  });

  test("matches the restored home dashboard screenshot", async ({ page }) => {
    await expect(page).toHaveScreenshot("home-dashboard-restored.png", {
      fullPage: true,
      animations: "disabled",
    });
  });
});
