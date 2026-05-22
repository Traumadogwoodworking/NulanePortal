"use client";

import { useCallback } from "react";
import { Trash2, UploadCloud } from "lucide-react";
import { attachmentConstraints } from "@/lib/docudent/schema";

type FileUploadPanelProps = {
  files: File[];
  onFilesChange: (files: File[]) => void;
};

function formatBytes(bytes: number) {
  if (bytes === 0) return "0 B";
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return `${(bytes / 1024 ** i).toFixed(1)} ${sizes[i]}`;
}

export function FileUploadPanel({ files, onFilesChange }: FileUploadPanelProps) {
  const handleFiles = useCallback(
    (selected: FileList | File[]) => {
      const addedFiles = Array.from(selected).filter(
        (file) =>
          file.size <= attachmentConstraints.maxFileSize &&
          attachmentConstraints.acceptedTypes.includes(file.type)
      );
      if (addedFiles.length) {
        onFilesChange([...files, ...addedFiles]);
      }
    },
    [files, onFilesChange]
  );

  const handleDrop = useCallback(
    (event: React.DragEvent<HTMLLabelElement>) => {
      event.preventDefault();
      handleFiles(event.dataTransfer.files);
    },
    [handleFiles]
  );

  const handleInputChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      if (event.target.files) {
        handleFiles(event.target.files);
      }
    },
    [handleFiles]
  );

  const removeFile = useCallback(
    (index: number) => {
      const updated = files.filter((_, idx) => idx !== index);
      onFilesChange(updated);
    },
    [files, onFilesChange]
  );

  return (
    <div className="space-y-4">
      <label
        onDrop={handleDrop}
        onDragOver={(event) => event.preventDefault()}
        className="relative flex flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed border-slate-300 bg-white px-4 py-10 text-center text-sm text-slate-500 transition hover:border-slate-400"
      >
        <UploadCloud className="h-8 w-8 text-slate-400" />
        <p className="text-xs uppercase tracking-[0.4em] text-slate-400">Upload documents</p>
        <p className="text-sm font-black text-slate-900">Drag & drop or click to browse</p>
        <input
          type="file"
          multiple
          className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
          onChange={handleInputChange}
        />
        <p className="text-[10px] text-slate-400">
          Max {(attachmentConstraints.maxFileSize / (1024 * 1024)).toFixed(0)}MB per file; accepts {attachmentConstraints.acceptedTypes.join(", ")}.
        </p>
      </label>
      {files.length > 0 && (
        <ul className="space-y-2">
          {files.map((file, idx) => (
            <li
              key={`${file.name}-${idx}`}
              className="flex items-center justify-between rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm"
            >
              <div className="flex flex-col">
                <span className="font-black text-slate-900">{file.name}</span>
                <span className="text-[10px] text-slate-500">{formatBytes(file.size)}</span>
              </div>
              <button
                type="button"
                onClick={() => removeFile(idx)}
                className="rounded-full p-2 text-slate-400 hover:text-rose-500"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
