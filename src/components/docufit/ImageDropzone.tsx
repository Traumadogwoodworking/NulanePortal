"use client";

import { useId, useState } from "react";
import { UploadCloud } from "lucide-react";
import type { DocuFitUploadMetadata } from "@/lib/services/measurementService";

interface ImageDropzoneProps {
  onUpload: (params: { file: File; metadata: DocuFitUploadMetadata }) => Promise<void>;
  uploading?: boolean;
  metadata?: DocuFitUploadMetadata;
}

export function ImageDropzone({ onUpload, uploading = false, metadata }: ImageDropzoneProps) {
  const inputId = useId();
  const [isDragging, setIsDragging] = useState(false);
  const buildMetadata = () => ({
    takenAt: metadata?.takenAt ?? new Date().toISOString(),
    notes: metadata?.notes ?? "",
  });

  const handleFiles = async (files: File[]) => {
    if (files.length === 0) {
      return;
    }
    for (const file of files) {
      await onUpload({ file, metadata: buildMetadata() });
    }
  };

  return (
    <label
      htmlFor={inputId}
      onDragOver={(event) => {
        event.preventDefault();
        setIsDragging(true);
      }}
      onDragLeave={() => setIsDragging(false)}
      onDrop={async (event) => {
        event.preventDefault();
        setIsDragging(false);
        const files = Array.from(event.dataTransfer.files).filter((file) => file.type.startsWith("image/"));
        if (files.length > 0) {
          await handleFiles(files);
        }
      }}
      className={`flex min-h-40 cursor-pointer flex-col items-center justify-center rounded-3xl border-2 border-dashed px-6 py-8 text-center transition-all ${
        isDragging ? "border-slate-400 bg-slate-50" : "border-slate-200 bg-white hover:border-slate-400"
      }`}
    >
      <input
        id={inputId}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={async (event) => {
          const input = event.currentTarget;
          const files = Array.from(event.target.files ?? []);
          if (files.length > 0) {
            await handleFiles(files);
          }
          input.value = "";
        }}
        disabled={uploading}
      />
      <UploadCloud className={`h-10 w-10 ${uploading ? "animate-pulse text-slate-700" : "text-slate-400"}`} />
      <p className="mt-4 text-sm font-black uppercase tracking-[0.2em] text-slate-800">
        {uploading ? "Uploading fit images..." : "Drop fit images here"}
      </p>
      <p className="mt-2 max-w-xs text-xs text-slate-500">
        Drag and drop one or more images, or click to choose files for the DocuFit upload queue.
      </p>
    </label>
  );
}
