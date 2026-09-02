import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

describe("damage report side-panel layout", () => {
  it("keeps the report details and photos visible below the xl breakpoint", () => {
    const source = readFileSync(
      join(process.cwd(), "src/portal/core/features/damage/ReportsManager.tsx"),
      "utf8"
    );

    expect(source).toContain(
      '<ScrollArea className="min-h-[32rem] flex-1 xl:min-h-0">'
    );
  });
});
