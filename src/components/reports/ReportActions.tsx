"use client";

import { CheckCircle2, Download, FileEdit, FileImage } from "lucide-react";
import type { MouseEvent } from "react";

type ActionHandler = (event?: MouseEvent<HTMLButtonElement>) => void;

interface ReportActionsProps {
  onEdit?: ActionHandler;
  editBlockedReason?: string;
  onApprove?: ActionHandler;
  approveDisabled?: boolean;
  approveBlockedReason?: string;
  showApprove?: boolean;
  onDownloadPhotos?: ActionHandler;
  photosLoading?: boolean;
  photosDisabled?: boolean;
  photosDisabledReason?: string;
  onDownloadPdf?: ActionHandler;
  pdfLoading?: boolean;
  pdfDisabled?: boolean;
  pdfDisabledReason?: string;
  className?: string;
}

export function ReportActions({
  onEdit,
  editBlockedReason,
  onApprove,
  approveDisabled,
  approveBlockedReason,
  showApprove = false,
  onDownloadPhotos,
  photosLoading,
  photosDisabled,
  photosDisabledReason,
  onDownloadPdf,
  pdfLoading,
  pdfDisabled,
  pdfDisabledReason,
  className = "",
}: ReportActionsProps) {
  const editDisabled = !onEdit || Boolean(editBlockedReason);
  const approveButtonDisabled = approveDisabled || !onApprove || Boolean(approveBlockedReason);
  const photosButtonDisabled = photosDisabled || photosLoading;
  const pdfButtonDisabled = pdfDisabled || pdfLoading;

  const commonButtonClasses =
    "w-full rounded-xl border border-slate-200 px-2.5 py-1.5 text-[10px] font-black uppercase tracking-[0.2em] text-slate-700 hover:border-slate-400 hover:text-slate-900 transition-all inline-flex items-center justify-center gap-1.5";

  const disabledClasses = "opacity-40 cursor-not-allowed border-slate-200";

  return (
    <div className={`flex flex-col items-stretch gap-2 ${className}`}>
      <button
        type="button"
        className={`${commonButtonClasses} ${editDisabled ? disabledClasses : ""} flex items-center gap-1`}
        aria-label="Edit report"
        title={editBlockedReason || "Edit report"}
        disabled={editDisabled}
        onClick={(event) => {
          if (editDisabled) return;
          onEdit?.(event);
        }}
      >
        <FileEdit className="w-3 h-3" />
        <span>Edit</span>
      </button>

      {showApprove ? (
        <button
          type="button"
          className={`${commonButtonClasses} ${approveButtonDisabled ? disabledClasses : ""} flex items-center gap-1`}
          aria-label="Approve report"
          title={approveBlockedReason || "Approve report"}
          disabled={approveButtonDisabled}
          onClick={(event) => {
            if (approveButtonDisabled) return;
            onApprove?.(event);
          }}
        >
          <CheckCircle2 className="w-3 h-3" />
          <span>Approve</span>
        </button>
      ) : null}

      <button
        type="button"
        className={`${commonButtonClasses} ${photosButtonDisabled ? disabledClasses : ""} border-emerald-500/30 text-emerald-700 hover:text-emerald-600`}
        aria-label="Download report photos"
        title={photosDisabledReason || "Backend action pending"}
        disabled={photosButtonDisabled}
        onClick={(event) => {
          if (photosButtonDisabled) return;
          onDownloadPhotos?.(event);
        }}
      >
        <FileImage className="w-3 h-3" />
        <span>{photosLoading ? "Preparing ZIP…" : "Download Photos"}</span>
      </button>

      <button
        type="button"
        className={`${commonButtonClasses} ${pdfButtonDisabled ? disabledClasses : ""} border-slate-900/30 hover:text-slate-900`}
        aria-label="Download report PDF"
        title={pdfDisabledReason || "Backend action pending"}
        disabled={pdfButtonDisabled}
        onClick={(event) => {
          if (pdfButtonDisabled) return;
          onDownloadPdf?.(event);
        }}
      >
        <Download className="w-3 h-3" />
        <span>{pdfLoading ? "Generating..." : "Download PDF"}</span>
      </button>
    </div>
  );
}
