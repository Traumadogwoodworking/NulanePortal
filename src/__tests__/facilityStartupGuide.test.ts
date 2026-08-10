import { describe, expect, it } from "vitest";
import { facilityStartupSteps } from "@/components/facilities/facilityStartupGuide";

describe("generic facility startup steps", () => {
  it("uses plain account and verification language", () => {
    const content = facilityStartupSteps
      .map((step) => `${step.title} ${step.detail}`)
      .join(" ");

    expect(content).toContain("Create account");
    expect(content).toContain("complete email verification when prompted");
    expect(content).toContain("loads during sign-in");
    expect(content).not.toContain("Auth0");
    expect(content.toLowerCase()).not.toContain("short-lived session");
    expect(content.toLowerCase()).not.toContain("refresh your assignments");
  });

  it("does not contain a Chicago-specific PDF generation path", () => {
    const content = JSON.stringify(facilityStartupSteps);
    expect(content).not.toContain("Chicago Heights");
    expect(content).not.toContain("quick-start.pdf");
  });
});
