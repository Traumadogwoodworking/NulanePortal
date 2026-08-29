import { AlertTriangle } from "lucide-react";

export function ConfirmActionDialog({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmLabel = "Confirm",
  isDestructive = false,
  isPending = false,
}: {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmLabel?: string;
  isDestructive?: boolean;
  isPending?: boolean;
}) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="fixed inset-0 bg-black/60" onClick={!isPending ? onClose : undefined} />
      <div className="relative z-50 w-full max-w-sm bg-slate-900 border border-white/10 rounded-2xl p-6 shadow-2xl">
        <div className="flex items-center gap-3 mb-4">
          {isDestructive && <AlertTriangle className="h-5 w-5 text-rose-500" />}
          <h2 className="text-lg font-semibold text-slate-100">{title}</h2>
        </div>
        <p className="text-sm text-slate-400 mb-8 leading-relaxed">
          {message}
        </p>
        <div className="flex justify-end gap-3">
          <button
            disabled={isPending}
            onClick={onClose}
            className="px-4 py-2 rounded-lg text-sm font-medium text-slate-300 hover:text-white hover:bg-white/5 transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            disabled={isPending}
            onClick={onConfirm}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-50 ${
              isDestructive 
                ? "bg-rose-500/10 text-rose-300 hover:bg-rose-500/20 border border-rose-500/20" 
                : "bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-200"
            }`}
          >
            {isPending ? "Working..." : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
