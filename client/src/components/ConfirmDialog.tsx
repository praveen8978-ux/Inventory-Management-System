import { useEffect, useRef } from "react";

type Props = {
  open: boolean;
  title: string;
  message: string;
  confirmLabel: string;
  busy?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
};

export default function ConfirmDialog({ open, title, message, confirmLabel, busy, onConfirm, onCancel }: Props) {
  const cancelRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    cancelRef.current?.focus();
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onCancel();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onCancel]);

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-20 grid place-items-center bg-stone-900/40 px-4" onClick={onCancel}>
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="confirm-title"
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-sm rounded-lg bg-white p-6 shadow-lg"
      >
        <h2 id="confirm-title" className="text-lg font-semibold">{title}</h2>
        <p className="mt-2 text-sm text-stone-600">{message}</p>
        <div className="mt-6 flex justify-end gap-3">
          <button ref={cancelRef} onClick={onCancel} disabled={busy}
            className="rounded-md border border-stone-300 px-4 py-2 text-sm font-medium hover:bg-stone-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-600">
            Cancel
          </button>
          <button onClick={onConfirm} disabled={busy}
            className="rounded-md bg-red-700 px-4 py-2 text-sm font-medium text-white hover:bg-red-800 disabled:opacity-60 focus:outline-none focus-visible:ring-2 focus-visible:ring-red-600 focus-visible:ring-offset-2">
            {busy ? "Deleting..." : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}