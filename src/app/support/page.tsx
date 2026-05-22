"use client";

import { useState, type ChangeEvent, type FormEvent } from "react";
import { Card, CardHeader, CardContent } from "@/components/ui/Card";
import { PageTitle } from "@/components/ui/PageTitle";
import { FileText, Paperclip } from "lucide-react";
import { submitSupportTicket } from "@/lib/services/supportService";

const MAX_FILES = 2;
const ACCEPTED_TYPES = new Set([
  "image/png",
  "image/jpeg",
  "image/webp",
  "image/gif",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/rtf",
]);

function formatBytes(bytes: number) {
  if (bytes <= 0) return "0 B";
  const units = ["B", "KB", "MB", "GB"];
  const index = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  const size = bytes / 1024 ** index;
  return `${size.toFixed(size >= 10 ? 0 : 1)} ${units[index]}`;
}

export default function SupportPage() {
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [statusTone, setStatusTone] = useState<"neutral" | "warning" | "danger" | "positive">("neutral");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const selected = Array.from(event.target.files ?? []);
    const accepted = selected.filter((file) => ACCEPTED_TYPES.has(file.type) && file.size <= 20 * 1024 * 1024);
    const tooLarge = selected.some((file) => file.size > 20 * 1024 * 1024);
    const combined = [...files, ...accepted].slice(0, MAX_FILES);
    const exceededLimit = files.length + accepted.length > MAX_FILES;
    setFiles(combined);
    setStatusTone(tooLarge || exceededLimit ? "warning" : "neutral");
    setStatusMessage(
      selected.length && accepted.length !== selected.length
        ? "Some files were skipped. Use images or Word documents under 20 MB only."
        : exceededLimit
          ? "Only up to 2 attachments can be submitted."
          : tooLarge
          ? "Some files were skipped because they exceeded 20 MB."
          : null
    );
    event.target.value = "";
  };

  const removeFile = (index: number) => {
    setFiles((current) => current.filter((_, currentIndex) => currentIndex !== index));
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (isSubmitting) return;
    setIsSubmitting(true);
    setStatusTone("neutral");
    setStatusMessage("Submitting ticket...");

    try {
      const formData = new FormData();
      formData.append("subject", subject.trim());
      formData.append("message", message.trim());
      files.forEach((file) => formData.append("attachments", file));

      const response = await submitSupportTicket(formData);
      const ticketId = response.ticket_id?.trim();
      setStatusTone("positive");
      setStatusMessage(
        ticketId ? `Ticket submitted. Ticket ID: ${ticketId}` : "Ticket submitted successfully."
      );
      setSubject("");
      setMessage("");
      setFiles([]);
    } catch (error) {
      const supportError = error as Error & {
        status?: number;
        details?: Array<{ field?: string; message?: string }>;
      };
      if (supportError.status === 400 && Array.isArray(supportError.details) && supportError.details.length) {
        setStatusTone("warning");
        setStatusMessage(supportError.details.map((detail) => detail.message).filter(Boolean).join(" · "));
      } else if (supportError.message) {
        setStatusTone("danger");
        setStatusMessage(
          supportError.message.includes("Unable to submit support ticket")
            ? "Unable to submit support ticket. Please try again."
            : supportError.message
        );
      } else {
        setStatusTone("danger");
        setStatusMessage("Unable to submit support ticket. Please try again.");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 pb-10">
      <PageTitle title="Support" subtitle="Open a ticket with a short description and optional attachments." />

      <Card>
        <CardHeader
          title="New Ticket"
          subtitle="The date and time are captured automatically. Include the issue details and up to two files."
        />
        <CardContent>
          <form className="space-y-5" onSubmit={handleSubmit}>
            <div className="grid gap-4 md:grid-cols-2">
              <label className="space-y-2 md:col-span-2">
                <span className="block text-xs font-semibold uppercase tracking-wider text-slate-500">Subject</span>
                <input
                  value={subject}
                  onChange={(event) => setSubject(event.target.value)}
                  disabled={isSubmitting}
                  className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-300"
                  placeholder="Brief summary of the issue"
                />
              </label>
              <label className="space-y-2 md:col-span-2">
                <span className="block text-xs font-semibold uppercase tracking-wider text-slate-500">Message</span>
                <textarea
                  value={message}
                  onChange={(event) => setMessage(event.target.value)}
                  rows={7}
                  disabled={isSubmitting}
                  className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-300"
                  placeholder="Describe what happened, where it happened, and what you expected to happen."
                />
              </label>
            </div>

              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 space-y-4">
              <div className="flex items-center gap-2">
                <Paperclip className="h-4 w-4 text-slate-500" />
                <p className="text-sm font-semibold text-slate-900">Attachments</p>
                <span className="rounded-full border border-slate-200 bg-white px-2 py-0.5 text-[10px] font-black uppercase tracking-widest text-slate-500">
                  max 2
                </span>
              </div>
              <label className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-slate-300 bg-white px-4 py-8 text-center transition hover:border-slate-400">
                <FileText className="h-8 w-8 text-slate-400" />
                <p className="text-sm font-semibold text-slate-900">Drag files here or click to browse</p>
                <p className="text-xs text-slate-500">Images or Word documents only.</p>
                  <input
                    type="file"
                    multiple
                    accept="image/*,.doc,.docx,.rtf"
                    onChange={handleFileChange}
                    className="hidden"
                    disabled={isSubmitting}
                  />
                </label>
              {files.length > 0 ? (
                <div className="space-y-2">
                  {files.map((file, index) => (
                    <div key={`${file.name}-${index}`} className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white px-3 py-2">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-slate-900">{file.name}</p>
                        <p className="text-xs text-slate-500">{file.type || "unknown type"} · {formatBytes(file.size)}</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => removeFile(index)}
                        disabled={isSubmitting}
                        className="rounded-full border border-slate-200 px-2.5 py-1 text-[10px] font-black uppercase tracking-widest text-slate-600 transition hover:bg-slate-50"
                      >
                        Remove
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-slate-500">No files attached yet.</p>
              )}
            </div>

            {statusMessage ? (
              <div
                className={`rounded-2xl border px-4 py-3 text-sm ${
                  statusTone === "positive"
                    ? "border-emerald-200 bg-emerald-50 text-emerald-900"
                    : statusTone === "warning"
                      ? "border-amber-200 bg-amber-50 text-amber-900"
                      : statusTone === "danger"
                        ? "border-rose-200 bg-rose-50 text-rose-900"
                        : "border-slate-200 bg-white text-slate-700"
                }`}
              >
                {statusMessage}
              </div>
            ) : null}

              <button
                type="submit"
                disabled={isSubmitting}
                className="rounded-2xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-70"
              >
              {isSubmitting ? "Submitting..." : "Submit Ticket"}
            </button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
