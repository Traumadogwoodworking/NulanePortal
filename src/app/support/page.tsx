"use client";

import { useRef, useState, type DragEvent, type FormEvent } from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/Card";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { submitSupportTicket } from "@/lib/services/supportService";

const MAX_MEDIA_FILES = 3;
const ACCEPTED_MEDIA_TYPES = new Set([
  "image/png",
  "image/jpeg",
  "image/webp",
  "image/gif",
  "image/heic",
  "image/heif",
  "video/mp4",
  "video/quicktime",
  "video/webm",
]);

export default function SupportPage() {
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [mediaFiles, setMediaFiles] = useState<File[]>([]);
  const [mediaError, setMediaError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const addMediaFiles = (incomingFiles: File[]) => {
    const accepted = incomingFiles.filter((file) => ACCEPTED_MEDIA_TYPES.has(file.type));
    const combined = [...mediaFiles, ...accepted].slice(0, MAX_MEDIA_FILES);
    setMediaFiles(combined);
    setMediaError(
      incomingFiles.length && accepted.length !== incomingFiles.length
        ? "Some files were skipped. Use images or common video files only."
        : null
    );
  };

  const removeMediaFile = (index: number) => {
    setMediaFiles((current) => current.filter((_, currentIndex) => currentIndex !== index));
  };

  const handleFilesSelected = (files: FileList | null) => {
    if (!files) return;
    addMediaFiles(Array.from(files));
  };

  const handleDrop = (event: DragEvent<HTMLLabelElement>) => {
    event.preventDefault();
    event.stopPropagation();
    addMediaFiles(Array.from(event.dataTransfer.files ?? []));
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSubmitting(true);
    setStatus(null);
    setError(null);

    try {
      const formData = new FormData();
      formData.set("subject", subject.trim());
      formData.set("message", message.trim());
      mediaFiles.forEach((file) => formData.append("media_files", file, file.name));
      await submitSupportTicket(formData);
      setStatus("Support ticket submitted.");
      setSubject("");
      setMessage("");
      setMediaFiles([]);
      setMediaError(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    } catch (submissionError) {
      setError(
        submissionError instanceof Error
          ? submissionError.message
          : "Unable to submit support ticket."
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="w-full space-y-6 pb-6">
      <Card>
        <CardHeader
          title="New Ticket"
          subtitle="Keep it short and include the report or account details that matter."
        />
        <CardContent>
          <form className="space-y-5" onSubmit={handleSubmit}>
            <div className="space-y-2">
              <label htmlFor="subject" className="block text-xs font-semibold uppercase tracking-wider text-slate-500">
                Subject
              </label>
              <input
                id="subject"
                value={subject}
                onChange={(event) => setSubject(event.target.value)}
                className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/20"
                placeholder="Brief summary of the issue"
                required
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="message" className="block text-xs font-semibold uppercase tracking-wider text-slate-500">
                Message
              </label>
              <textarea
                id="message"
                value={message}
                onChange={(event) => setMessage(event.target.value)}
                rows={8}
                className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/20"
                placeholder="Describe the issue, where it happened, and what you expected to happen."
                required
              />
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between gap-3">
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500">
                  Media files
                </label>
                <span className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-[10px] font-black uppercase tracking-widest text-slate-500">
                  up to 3
                </span>
              </div>
              <label
                onDrop={handleDrop}
                onDragOver={(event) => event.preventDefault()}
                className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-[1.5rem] border border-dashed border-slate-300 bg-slate-50 px-4 py-8 text-center transition hover:border-brand hover:bg-white"
              >
                <p className="text-sm font-semibold text-slate-900">Drag and drop images or videos here</p>
                <p className="text-xs text-slate-500">PNG, JPG, WEBP, GIF, HEIC, MP4, MOV, or WEBM.</p>
                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  accept="image/*,video/*"
                  className="hidden"
                  onChange={(event) => handleFilesSelected(event.target.files)}
                />
                <span className="rounded-full bg-slate-950 px-4 py-2 text-xs font-semibold text-white">
                  Browse files
                </span>
              </label>
              {mediaFiles.length > 0 ? (
                <div className="space-y-2">
                  {mediaFiles.map((file, index) => (
                    <div key={`${file.name}-${index}`} className="flex items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-slate-900">{file.name}</p>
                        <p className="text-xs text-slate-500">{file.type || "unknown type"}</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => removeMediaFile(index)}
                        className="rounded-full border border-slate-200 px-3 py-1 text-[10px] font-black uppercase tracking-widest text-slate-600 transition hover:bg-slate-50"
                      >
                        Remove
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-slate-500">No media attached yet.</p>
              )}
              {mediaError ? <p className="text-sm text-amber-700">{mediaError}</p> : null}
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <button
                type="submit"
                disabled={isSubmitting}
                className="rounded-2xl bg-brand px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-brand-accent disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isSubmitting ? "Submitting..." : "Submit Ticket"}
              </button>
              <StatusBadge
                label="Portal API submission"
                tone="positive"
              />
            </div>

            {status ? (
              <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">
                {status}
              </div>
            ) : null}

            {error ? (
              <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-900">
                {error}
              </div>
            ) : null}
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
