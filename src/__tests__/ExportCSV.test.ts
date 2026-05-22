import { test, expect } from "vitest";
import { buildCsvContent, measurementsToExportRows } from "@/lib/docufit/exportUtils";
import type { MeasurementPoint } from "@/lib/services/measurementService";

test("CSV header & row count", () => {
  const rows = measurementsToExportRows([
    { id: "m1", takenAt: "2026-04-03T00:00:00Z", dimension: "Waist", measurement: { value: 82 } },
    { id: "m2", takenAt: "2026-04-04T00:00:00Z", dimension: "Waist", measurement: { value: 83 } },
  ] as MeasurementPoint[]);

  const csv = buildCsvContent(rows);
  expect(csv.split("\n").length).toBe(3);
  expect(csv.startsWith('"Date","Dimension","Value (mm)"')).toBeTruthy();
});
