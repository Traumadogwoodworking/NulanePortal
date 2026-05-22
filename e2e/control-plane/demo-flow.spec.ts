import { expect, test } from "playwright/test";
import { capturePageIssues, setSuperAdminDevSession } from "../utils/surfaceHarness";

test("operator demo flow links outbox to reports and back", async ({ page }) => {
  const issues = capturePageIssues(page);
  await setSuperAdminDevSession(page);

  await page.goto("/control/outbox");
  const reportLinkedCue = page.getByText("Linked report available").first();
  await expect(reportLinkedCue).toBeVisible();
  await reportLinkedCue.click();

  await expect(page.getByText("Trace Context")).toBeVisible();
  await expect(page.getByRole("link", { name: "Open linked report" })).toBeVisible();
  await expect(page.getByText("Report ID: damage-001")).toBeVisible();
  await expect(page.getByText("Outbox ID: outbox-001")).toBeVisible();

  const unlinkedCue = page.getByText("No linked report available").first();
  await expect(unlinkedCue).toBeVisible();
  await unlinkedCue.click();
  await expect(page.getByText("Report ID: Not linked")).toBeVisible();
  await expect(page.getByText("Report link unavailable")).toBeVisible();

  await reportLinkedCue.click();

  await page.getByRole("link", { name: "Open linked report" }).click();
  await expect(page).toHaveURL(/\/control\/reports\/?\?reportId=damage-001/);
  await expect(page.getByText("Report detail", { exact: true })).toBeVisible();
  await expect(page.getByText("Report ID: damage-001")).toBeVisible();
  await expect(page.getByText("Outbox ID: outbox-001")).toBeVisible();
  await expect(page.getByText("Trace Context", { exact: true })).toBeVisible();
  await expect(page.getByRole("link", { name: "Open outbox row" })).toBeVisible();

  await page.goBack();
  await expect(page).toHaveURL(/\/control\/outbox\/?/);

  const retryRow = page.getByRole("row").filter({ hasText: "Failed / retryable" }).first();
  await retryRow.click();
  const retryButton = page.getByRole("button", { name: /^Retry$/ }).first();
  await expect(retryButton).toBeEnabled();
  page.once("dialog", (dialog) => dialog.accept());
  await retryButton.click();
  await expect(page.locator("body")).toContainText(/Retrying...|Retry queued for outbox-002\.|retry · failure · SMTP_TIMEOUT/i);

  const repairRow = page.getByRole("row").filter({ hasText: "Sent" }).first();
  await repairRow.click();
  const repairButton = page.getByRole("button", { name: /^Repair$/ }).first();
  await expect(repairButton).toBeEnabled();
  page.once("dialog", (dialog) => dialog.accept());
  await repairButton.click();
  await expect(page.locator("body")).toContainText(/Repairing...|Repair queued for outbox-001\.|repair.*(failure|failed)/i);

  expect(issues).toEqual([]);
});
