"use client";

import { ANALYTICS_DAILY_FACILITY_REQUIREMENTS, ANALYTICS_DAILY_INSPECTOR_REQUIREMENTS } from "../constants";
import { buildAnalyticsCoverageIssues } from "../analytics-adapters";
import type { AnalyticsDailySplitCoverage } from "../types";

export function AnalyticsCoverageAlert({ coverage }: { coverage: AnalyticsDailySplitCoverage }) {
  const issues = buildAnalyticsCoverageIssues(coverage);
  if (!issues.length) {
    return null;
  }

  const facilityStatus = !coverage.facility.hasRows
    ? "No byFacilityDaily data returned"
    : coverage.facility.hasClearDamageSplit
      ? `Facility rows with clear/damaged split: ${coverage.facility.splitRows}`
      : "Facility rows are not returning both clear and damaged split fields";
  const inspectorStatus = !coverage.inspector.hasRows
    ? "No byInspectorDaily data returned"
    : coverage.inspector.hasClearDamageSplit
      ? `Inspector rows with clear/damaged split: ${coverage.inspector.splitRows}`
      : "Inspector rows are not returning both clear and damaged split fields";

  return (
    <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
      <p className="font-semibold">Analytics split data is incomplete</p>
      <p className="mt-1">
        Home analytics is loading from <span className="font-mono">{coverage.endpoint}</span> and can show clear/damaged breakdowns only if each
        daily row includes both values.
      </p>
      <p className="mt-1 text-[12px]">{facilityStatus}.</p>
      <p className="mt-0.5 text-[12px]">{inspectorStatus}.</p>
      <p className="mt-2 text-[12px]">Backend daily payload should include these row shapes:</p>
      <p className="mt-1 text-[12px]">
        <span className="font-semibold">byFacilityDaily</span> rows:
        <span className="font-mono"> {ANALYTICS_DAILY_FACILITY_REQUIREMENTS.join(" | ")} </span>
      </p>
      <p className="mt-0.5 text-[12px]">
        <span className="font-semibold">byInspectorDaily</span> rows:
        <span className="font-mono"> {ANALYTICS_DAILY_INSPECTOR_REQUIREMENTS.join(" | ")} </span>
      </p>
      <div className="mt-2 space-y-1 text-[12px]">
        {issues.map((issue) => (
          <p key={issue.visualId}>
            <span className="font-semibold">{issue.label}</span> expects
            <span className="font-mono"> {issue.missingFields.join(", ") || "damageReports and noDamageReports"} </span>.
          </p>
        ))}
      </div>
    </div>
  );
}
