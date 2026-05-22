import { expect, test } from "playwright/test";
import {
  capturePageIssues,
  clearDevSessionRole,
  setLimitedDevSession,
  setSuperAdminDevSession,
} from "../utils/surfaceHarness";

test("control plane shell loads tenant-admin and operations routes", async ({ page }) => {
  const issues = capturePageIssues(page);
  await setSuperAdminDevSession(page);

  await page.goto("/facilities");
  await expect(page.getByRole("heading", { name: "Facilities" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Infrastructure Registry" })).toBeVisible();

  await page.goto("/delivery-rules");
  await expect(page.getByRole("heading", { name: "Delivery Rules", level: 1 })).toBeVisible();

  await page.goto("/settings");
  await expect(page.getByRole("main").getByRole("heading", { name: "Settings" })).toBeVisible();
  await expect(page.getByText("Customer-facing", { exact: true })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Branding editor" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Open branding editor" })).toBeVisible();
  await page.getByRole("link", { name: "Open branding editor" }).click();
  await expect(page.getByRole("heading", { name: "Branding Studio" })).toBeVisible();

  await page.goto("/control/settings");
  await expect(page.getByText("Admin inspection only")).toBeVisible();
  await expect(page.getByText("No supported write controls are exposed on this page.")).toBeVisible();

  await page.goto("/control/overview");
  await expect(page.getByText("Operational attention")).toBeVisible();
  await expect(page.getByText("Quick commands")).toBeVisible();

  await page.goto("/control/reports");
  await expect(page.getByRole("heading", { name: "Recent reports" })).toBeVisible();

  await page.goto("/control/email");
  await expect(page.getByText("Outbound delivery")).toBeVisible();

  await page.goto("/control/organizations");
  await expect(page.getByText("Global admin scope")).toBeVisible();

  await page.goto("/control/integrations");
  await expect(page.getByText("No dedicated connector inventory API")).toBeVisible();

  expect(issues).toEqual([]);
});

test("control plane route gating blocks limited sessions", async ({ page }) => {
  await setLimitedDevSession(page);

  await page.goto("/control/overview");
  await expect(page.getByRole("heading", { name: "Control plane access denied" })).toBeVisible();

  await page.goto("/users");
  await expect(page.getByRole("heading", { name: "Control plane access denied" })).toBeVisible();
});
