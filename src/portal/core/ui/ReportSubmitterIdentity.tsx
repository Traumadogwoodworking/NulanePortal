import {
  getReportSubmitterIdentity,
  type ReportSubmitterSource,
} from "@/portal/core/data/reportSubmitterIdentity";

export function ReportSubmitterIdentity({
  source,
  align = "left",
  className = "",
}: {
  source: ReportSubmitterSource | null | undefined;
  align?: "left" | "center";
  className?: string;
}) {
  const { name, email } = getReportSubmitterIdentity(source);

  return (
    <div
      aria-label="Submitted by"
      className={`${align === "center" ? "text-center" : "text-left"} ${className}`.trim()}
    >
      <span className="block break-words text-sm font-semibold text-slate-800">
        {name || "Submitter unavailable"}
      </span>
      <span className="block break-all text-xs text-slate-500">
        {email || "Email unavailable"}
      </span>
    </div>
  );
}
