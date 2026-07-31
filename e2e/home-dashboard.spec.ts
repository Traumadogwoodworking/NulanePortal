import { expect, test } from "playwright/test";
import {
  homeDashboardAnalyticsFixture,
  homeDashboardReportListFixture,
  homeDashboardShapAnalyticsFixture,
} from "./fixtures/home-dashboard-fixture";

async function mockHomeDashboardApis(page: import("playwright/test").Page) {
  await page.route("**/dashboard/analytics**", async (route) => {
    const url = new URL(route.request().url());
    await route.fulfill({
      json: url.searchParams.get("facility_id") === "it-9a6e0f-locawctshap"
        ? homeDashboardShapAnalyticsFixture
        : homeDashboardAnalyticsFixture,
    });
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
    await expect(page.getByRole("heading", { name: "Daily Inspection Submissions" })).toBeVisible();
    await expect(page.getByText("Severity Detail")).toBeVisible();
    await expect(page.getByText("Top Damage Areas")).toBeVisible();
    await expect(page.getByRole("heading", { name: "Daily Inspector Inspection Submissions" })).toBeVisible();
    await expect(page.getByRole("button", { name: /Export CSV/i }).first()).toBeVisible();
  });

  test("applies the facility filter response to every dashboard section", async ({ page }) => {
    const filteredRequest = page.waitForRequest((request) => {
      const url = new URL(request.url());
      return url.pathname.endsWith("/dashboard/analytics") &&
        url.searchParams.get("facility_id") === "it-9a6e0f-locawctshap";
    });

    await page.getByLabel("Facility").selectOption("it-9a6e0f-locawctshap");
    await filteredRequest;

    const metricCard = (label: string) =>
      page.getByText(label, { exact: true })
        .locator("xpath=ancestor::div[contains(@class,'border-slate-200')][1]");
    await expect(metricCard("Total Damage Submissions")).toContainText("2");
    await expect(metricCard("Active Facilities")).toContainText("1");
    await expect(metricCard("Unique Inspectors")).toContainText("1");

    const facilityCard = page.getByRole("heading", { name: "Daily Inspection Submissions" })
      .locator("xpath=ancestor::div[contains(@class,'border-slate-200')][1]");
    await expect(facilityCard).toContainText("ending Jul 9");
    await expect(facilityCard).toContainText("SHAP");
    await expect(facilityCard).not.toContainText("JNAP");

    const inspectorCard = page.getByRole("heading", { name: "Daily Inspector Inspection Submissions" })
      .locator("xpath=ancestor::div[contains(@class,'border-slate-200')][1]");
    await expect(inspectorCard).toContainText("inspector@example.com");
    await expect(inspectorCard).not.toContainText("lead@example.com");

    const severityCard = page.getByRole("heading", { name: "Severity Detail" })
      .locator("xpath=ancestor::div[contains(@class,'border-slate-200')][1]");
    await expect(severityCard).toContainText("Missing / Major Damage");
    await expect(severityCard).not.toContainText(">3 in to <=6 in");

    const areaCard = page.getByRole("heading", { name: "Top Damage Areas" })
      .locator("xpath=ancestor::div[contains(@class,'border-slate-200')][1]");
    await expect(areaCard).toContainText("Front Bumper");
    await expect(areaCard).not.toContainText("Hood");
  });

  test("keeps facility and inspector charts fixed while showing damaged and clear tooltips", async ({ page }) => {
    for (const headingName of ["Daily Inspection Submissions", "Daily Inspector Inspection Submissions"]) {
      const card = page
        .getByRole("heading", { name: headingName })
        .locator("xpath=ancestor::div[contains(@class,'bg-white') and contains(@class,'border-slate-200')][1]");
      const chart = card.locator(".recharts-wrapper").first();
      const bars = card.locator(".recharts-bar-rectangle");
      let visibleBar = bars.first();
      for (let index = 0; index < await bars.count(); index += 1) {
        const candidate = bars.nth(index);
        const box = await candidate.boundingBox();
        if (box && box.width > 1 && box.height > 1) {
          visibleBar = candidate;
          break;
        }
      }

      await chart.scrollIntoViewIfNeeded();
      const beforeHover = await chart.boundingBox();
      expect(beforeHover).not.toBeNull();
      await visibleBar.hover({ force: true });

      const tooltip = card.locator(".recharts-tooltip-wrapper").filter({ hasText: "Damaged" }).first();
      await expect(tooltip).toContainText("Clear");
      const afterHover = await chart.boundingBox();
      expect(afterHover).not.toBeNull();
      expect(afterHover?.x).toBeCloseTo(beforeHover?.x ?? 0, 5);
      expect(afterHover?.y).toBeCloseTo(beforeHover?.y ?? 0, 5);
      expect(afterHover?.width).toBeCloseTo(beforeHover?.width ?? 0, 5);
      expect(afterHover?.height).toBeCloseTo(beforeHover?.height ?? 0, 5);
    }
  });

  test("shows scoped facility breakdowns only inside pie hover tooltips", async ({ page }) => {
    await page.setViewportSize({ width: 1600, height: 1200 });
    const cases = [
      {
        heading: "Severity Detail",
        sectionLabel: "Severity section",
        removedDescription: "Damaged submissions grouped by the highest severity recorded in each submission.",
      },
      {
        heading: "Top Damage Areas",
        sectionLabel: "Damage area",
        removedDescription: "Damaged submissions containing this area; each submission counts once per area.",
      },
    ];

    for (const item of cases) {
      const card = page
        .getByRole("heading", { name: item.heading })
        .locator("xpath=ancestor::div[contains(@class,'bg-white') and contains(@class,'border-slate-200')][1]");
      await expect(card).not.toContainText(item.removedDescription);
      await expect(card).not.toContainText("Share");
      await expect(card.locator("svg text").filter({ hasText: "%" })).toHaveCount(0);
      await expect(card.locator('g[role="button"]')).toHaveCount(0);

      const firstSector = card.locator(".recharts-pie-sector").first();
      await firstSector.hover({ force: true });
      const tooltip = card.locator(".recharts-tooltip-wrapper").filter({ hasText: item.sectionLabel }).first();
      await expect(tooltip).toContainText(item.sectionLabel);
      await expect(tooltip).toContainText("Count");
      await expect(tooltip).toContainText("Facility breakdown");
      await expect(tooltip).not.toContainText("Facilities in your access");
      await expect(tooltip.getByTestId("pie-facility-row").first()).toBeVisible();
      await expect(tooltip.getByTestId("pie-tooltip-count")).toHaveClass(/bg-white/);
      await expect(tooltip.getByTestId("pie-tooltip-count")).toHaveClass(/text-slate-950/);
      await expect(tooltip).not.toContainText(item.removedDescription);
    }
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
