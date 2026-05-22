"use client";

import { useEffect, useRef, useState } from "react";
import { ChevronDown, Download, FileText } from "lucide-react";

interface ExportMenuProps {
  onExportCsv: () => Promise<void> | void;
  onExportPdf: () => Promise<void> | void;
  disabled?: boolean;
  csvLoading?: boolean;
  pdfLoading?: boolean;
}

export function ExportMenu({
  onExportCsv,
  onExportPdf,
  disabled = false,
  csvLoading = false,
  pdfLoading = false,
}: ExportMenuProps) {
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const maybeDisable = disabled || csvLoading || pdfLoading;

  return (
    <div ref={menuRef} className="relative">
      <button
        type="button"
        disabled={maybeDisable}
        aria-haspopup="true"
        aria-expanded={open}
        onClick={() => setOpen((prev) => !prev)}
        className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-2 text-xs font-black uppercase tracking-widest text-slate-700 shadow-sm transition hover:border-slate-400 hover:text-slate-900 disabled:cursor-not-allowed disabled:opacity-60"
      >
        <Download className="h-4 w-4" />
        Export
        <ChevronDown className="h-3 w-3" />
      </button>
      {open && (
        <div className="absolute right-0 z-20 mt-2 w-48 divide-y divide-slate-100 rounded-2xl border border-slate-200 bg-white shadow-lg">
          <button
            type="button"
            disabled={maybeDisable}
            onClick={async () => {
              setOpen(false);
              await onExportCsv();
            }}
            className="flex w-full items-center gap-2 px-4 py-3 text-left text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:text-slate-400"
          >
            <FileText className="h-4 w-4" />
            <span>
              {csvLoading ? "Building CSV" : "Export CSV"}
            </span>
          </button>
          <button
            type="button"
            disabled={maybeDisable}
            onClick={async () => {
              setOpen(false);
              await onExportPdf();
            }}
            className="flex w-full items-center gap-2 px-4 py-3 text-left text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:text-slate-400"
          >
            <FileText className="h-4 w-4" />
            <span>
              {pdfLoading ? "Building PDF" : "Export PDF"}
            </span>
          </button>
        </div>
      )}
    </div>
  );
}
