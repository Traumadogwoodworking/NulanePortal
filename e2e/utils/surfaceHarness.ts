import type { Page } from "playwright/test";

export function capturePageIssues(page: Page): string[] {
  const issues: string[] = [];
  const ignoredPageErrors = [
    "Failed to read the 'localStorage' property from 'Window': The document is sandboxed and lacks the 'allow-same-origin' flag.",
  ];

  page.on("console", (message) => {
    if (message.type() === "error") {
      issues.push(`console: ${message.text()}`);
    }
  });

  page.on("pageerror", (error) => {
    if (ignoredPageErrors.some((needle) => error.message.includes(needle))) {
      return;
    }
    issues.push(`pageerror: ${error.message}`);
  });

  return issues;
}

export async function setLimitedDevSession(page: Page): Promise<void> {
  await page.addInitScript(() => {
    window.localStorage.setItem("portalDevSessionRole", "limited");
  });
}

export async function clearDevSessionRole(page: Page): Promise<void> {
  await page.addInitScript(() => {
    window.localStorage.removeItem("portalDevSessionRole");
  });
}

export async function setSuperAdminDevSession(page: Page): Promise<void> {
  await page.addInitScript(() => {
    window.localStorage.setItem("portalDevSessionRole", "super_admin");
  });
}
