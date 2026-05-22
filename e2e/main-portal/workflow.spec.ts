import { expect, test } from "playwright/test";
import { configureApiMocks } from "../utils/apiMock";
import { capturePageIssues, clearDevSessionRole } from "../utils/surfaceHarness";

test("docufit workflow smoke stays functional", async ({ page }) => {
  const issues = capturePageIssues(page);
  await clearDevSessionRole(page);
  await configureApiMocks(page);

  await page.goto("/docufit");
  await expect(page.getByRole("heading", { name: "Valad Fit workflow" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Milestone queue" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Upload imagery" })).toBeVisible();

  const fileInput = page.locator('input[type="file"]');
  await fileInput.setInputFiles("test/fixtures/upload.png");
  await expect(page.getByText("Upload queued for sync.")).toBeVisible({ timeout: 10_000 });
  await expect(page.getByText("1 files queued")).toBeVisible();

  expect(issues).toEqual([]);
});
