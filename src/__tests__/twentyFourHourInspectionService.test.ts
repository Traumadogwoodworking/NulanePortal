import { describe, expect, it } from "vitest";
import {
  buildTwentyFourHourDisplayEndpoint,
  filterTwentyFourHourRows,
  orderTwentyFourHourRowsByPriority,
  validateTwentyFourHourInspectionResponse,
} from "@/lib/services/twentyFourHourInspectionService";

function rawRow(overrides: Record<string, unknown> = {}) {
  return {
    id: "snapshot-1:1",
    inventory_row_id: "snapshot-1:1",
    snapshot_id: "snapshot-1",
    vin: "UNINSPECTEDVIN001",
    bucket: "needs_inspected",
    inspected: false,
    severity: "overdue",
    display_label: "Overdue · 1h 0m",
    display_background_color: "#000000",
    display_text_color: "#ffffff",
    first_seen_at: "2026-07-18T10:00:00.000Z",
    last_seen_at: "2026-07-19T11:00:00.000Z",
    current_server_time: "2026-07-19T11:00:00.000Z",
    time_in_inventory_seconds: 90_000,
    time_until_24h_seconds: 0,
    overdue_seconds: 3_600,
    facility: "SHAP",
    location: "SHAP/SHAP/A12",
    ...overrides,
  };
}

function rawResponse(rows: unknown[] = [rawRow()]) {
  return {
    ok: true,
    request_id: "request-1",
    inspection_type: "24_hour",
    generated_at: "2026-07-19T11:00:00.000Z",
    current_server_time: "2026-07-19T11:00:00.000Z",
    archive_window_days: 3,
    snapshot: {
      id: "snapshot-1",
      status: "completed",
      capture_time: "2026-07-19T10:55:00.000Z",
      completed_at: "2026-07-19T10:56:00.000Z",
      total_raw_rows: rows.length,
      accepted_active_rows: rows.length,
      excluded_stale_rows: 0,
      rejected_malformed_rows: 0,
      deduplicated_rows: 0,
    },
    summary: {},
    totals: {},
    metadata: {},
    rows,
    warnings: [],
  };
}

describe("24-hour inspection data contract", () => {
  it("uses stable pagination parameters without a refresh cache-buster", () => {
    const first = buildTwentyFourHourDisplayEndpoint({ facility: "SHAP", requestId: "refresh-1" });
    const second = buildTwentyFourHourDisplayEndpoint({ facility: "SHAP", requestId: "refresh-2" });

    expect(first).toBe("/inspection/24-hour/display?page=1&pageSize=250&facility=SHAP");
    expect(second).toBe(first);
  });

  it("accepts rows explicitly associated with the latest completed snapshot", () => {
    const result = validateTwentyFourHourInspectionResponse(rawResponse(), "fallback");
    expect(result.rows.map((row) => row.vin)).toEqual(["UNINSPECTEDVIN001"]);
    expect(result.snapshot.id).toBe("snapshot-1");
  });

  it("excludes rows associated with an older snapshot", () => {
    const result = validateTwentyFourHourInspectionResponse(rawResponse([
      rawRow(),
      rawRow({ id: "snapshot-0:2", inventory_row_id: "snapshot-0:2", snapshot_id: "snapshot-0", vin: "STALEVIN000000001" }),
    ]), "fallback");
    expect(result.rows).toHaveLength(1);
    expect(result.metadata.client_excluded_stale_rows).toBe(1);
  });

  it("keeps an active older-than-24-hour row as canonical Overdue", () => {
    const result = validateTwentyFourHourInspectionResponse(rawResponse(), "fallback");
    expect(result.rows[0]).toMatchObject({ severity: "overdue", overdue_seconds: 3_600 });
  });

  it("rejects the contradictory legacy critical_24h status", () => {
    expect(() => validateTwentyFourHourInspectionResponse(rawResponse([rawRow({ severity: "critical_24h" })]), "fallback"))
      .toThrow(/Every returned inventory row failed contract validation/);
  });

  it("rejects inspected rows that retain an uninspected severity", () => {
    expect(() => validateTwentyFourHourInspectionResponse(rawResponse([rawRow({ inspected: true, bucket: "inspected" })]), "fallback"))
      .toThrow(/Every returned inventory row failed contract validation/);
  });

  it("searches explicit identifiers across inspected and uninspected rows", () => {
    const result = validateTwentyFourHourInspectionResponse(rawResponse([
      rawRow(),
      rawRow({
        id: "snapshot-1:2",
        inventory_row_id: "snapshot-1:2",
        vin: "INSPECTEDVIN00001",
        inspected: true,
        bucket: "inspected",
        severity: "inspected",
        display_label: "Inspected",
        report_id: "REPORT-INSPECTED-9",
        time_until_24h_seconds: 0,
        overdue_seconds: 0,
      }),
    ]), "fallback");
    expect(filterTwentyFourHourRows(result.rows, { search: "REPORT-INSPECTED", yard: "", recordFilter: "all" })[0].vin).toBe("INSPECTEDVIN00001");
    expect(filterTwentyFourHourRows(result.rows, { search: "UNINSPECTEDVIN", yard: "", recordFilter: "all" })[0].vin).toBe("UNINSPECTEDVIN001");
  });

  it("filters without mutating the canonical dataset", () => {
    const result = validateTwentyFourHourInspectionResponse(rawResponse([
      rawRow(),
      rawRow({ id: "snapshot-1:2", inventory_row_id: "snapshot-1:2", vin: "CRITICALVIN00001", severity: "critical", display_label: "Critical" }),
    ]), "fallback");
    expect(filterTwentyFourHourRows(result.rows, { search: "", yard: "", recordFilter: "critical" })).toHaveLength(1);
    expect(result.rows).toHaveLength(2);
  });

  it("orders visible work by urgency without mutating the filtered rows", () => {
    const result = validateTwentyFourHourInspectionResponse(rawResponse([
      rawRow({ id: "snapshot-1:normal", inventory_row_id: "snapshot-1:normal", vin: "NORMALVIN00000001", severity: "normal", display_label: "Normal", time_until_24h_seconds: 40_000, overdue_seconds: 0 }),
      rawRow({ id: "snapshot-1:critical", inventory_row_id: "snapshot-1:critical", vin: "CRITICALVIN00001", severity: "critical", display_label: "Critical", time_until_24h_seconds: 1_000, overdue_seconds: 0 }),
      rawRow({ id: "snapshot-1:overdue-1", inventory_row_id: "snapshot-1:overdue-1", vin: "OVERDUEVIN000001", overdue_seconds: 3_600 }),
      rawRow({ id: "snapshot-1:overdue-2", inventory_row_id: "snapshot-1:overdue-2", vin: "OVERDUEVIN000002", overdue_seconds: 7_200 }),
      rawRow({ id: "snapshot-1:inspected", inventory_row_id: "snapshot-1:inspected", vin: "INSPECTEDVIN00001", inspected: true, bucket: "inspected", severity: "inspected", display_label: "Inspected", time_until_24h_seconds: 0, overdue_seconds: 0 }),
    ]), "fallback");

    const originalOrder = result.rows.map((row) => row.vin);
    expect(orderTwentyFourHourRowsByPriority(result.rows).map((row) => row.vin)).toEqual([
      "OVERDUEVIN000002",
      "OVERDUEVIN000001",
      "CRITICALVIN00001",
      "NORMALVIN00000001",
      "INSPECTEDVIN00001",
    ]);
    expect(result.rows.map((row) => row.vin)).toEqual(originalOrder);
  });

  it("deduplicates stable identities deterministically", () => {
    const result = validateTwentyFourHourInspectionResponse(rawResponse([rawRow(), rawRow({ vin: "DUPLICATEVIN00001" })]), "fallback");
    expect(result.rows.map((row) => row.vin)).toEqual(["UNINSPECTEDVIN001"]);
    expect(result.metadata.client_deduplicated_rows).toBe(1);
  });

  it("reports malformed rows while preserving valid rows", () => {
    const result = validateTwentyFourHourInspectionResponse(rawResponse([rawRow(), { vin: "NO-IDENTITY" }]), "fallback");
    expect(result.rows).toHaveLength(1);
    expect(result.metadata.client_rejected_rows).toBe(1);
  });

  it("fails a fully malformed response visibly", () => {
    expect(() => validateTwentyFourHourInspectionResponse({ ok: true, rows: [] }, "fallback-request"))
      .toThrow(/response shape is unusable/);
  });
});
