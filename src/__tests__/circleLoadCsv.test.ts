import { describe, expect, it } from "vitest";
import {
  isValidCircleVin,
  parseCircleVehicleCsv,
} from "@/lib/circleLoadCsv";

describe("Circle load CSV", () => {
  it("imports header metadata and quoted values", () => {
    const result = parseCircleVehicleCsv(
      'VIN,Year,Make,Model,Submodel,Color,Bay\n1HGCM82633A123456,2026,Toyota,Crown,"Limited, AWD",Blue,A-1',
    );
    expect(result.errors).toEqual([]);
    expect(result.vehicles[0]).toMatchObject({
      vin: "1HGCM82633A123456",
      year: "2026",
      make: "Toyota",
      model: "Crown",
      submodel: "Limited, AWD",
      color: "Blue",
      bay: "A-1",
    });
  });

  it("reports malformed and duplicate rows without hiding accepted rows", () => {
    const result = parseCircleVehicleCsv(
      "VIN\nSHORT\n1HGCM82633A123456\n1HGCM82633A123456",
    );
    expect(result.vehicles).toHaveLength(1);
    expect(result.errors).toEqual([
      expect.objectContaining({
        row: 2,
        message: expect.stringContaining("17"),
      }),
      expect.objectContaining({
        row: 4,
        message: expect.stringContaining("Duplicate"),
      }),
    ]);
  });

  it("uses the shared 17-character VIN contract", () => {
    expect(isValidCircleVin("1HGCM82633A123456")).toBe(true);
    expect(isValidCircleVin("1HGCM82633I123456")).toBe(false);
  });
});
