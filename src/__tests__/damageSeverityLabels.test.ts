import { describe, expect, test } from "vitest";
import { DAMAGE_SEVERITIES } from "@/lib/docudent/damageTaxonomy";

describe("damage severity labels", () => {
  test("spells out measurement units for every measured severity", () => {
    const measuredLabels = DAMAGE_SEVERITIES.filter((severity) => severity.value !== "6").map(
      (severity) => severity.label
    );

    expect(measuredLabels).toHaveLength(5);
    measuredLabels.forEach((label) => {
      expect(label).toContain("inch");
      expect(label).toContain("centimeter");
      expect(label).not.toContain('"');
      expect(label).not.toMatch(/\bcm\b/i);
    });
  });
});
