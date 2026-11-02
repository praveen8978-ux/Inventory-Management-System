import { useEffect, useRef, useState, type FormEvent } from "react";
import { api, parseApiError } from "../api/client";
import type { Product } from "../types/product";

type Props = {
  product: Product;
  onClose: () => void;
  onSaved: (updated: Product) => void;
};

export default function AdjustStockDialog({ product, onClose, onSaved }: Props) {
  const [delta, setDelta] = useState("");
  const [note, setNote] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && !submitting && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose, submitting]);

  const n = Number(delta);
  const valid = delta.trim() !== "" && Number.isInteger(n) && n !== 0;
  const next = valid ? product.quantityOnHand + n : null;

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    if (!valid) return setError("Enter a whole number other than 0, like 5 or -3");
    if (next !== null && next < 0) {
      return setError(`You can't remove more than the ${product.quantityOnHand} units in stock`);
    }

    setSubmitting(true);
    try {
      const r = await api.patch<Product>(`/products/${product.id}/adjust`, {
        delta: n,
        note: note.trim() || null,
      });
      onSaved(r.data);
    } catch (err) {
      const e2 = parseApiError(err);
      setError(e2.fieldErrors.delta ?? e2.fieldErrors.note ?? e2.message);
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-20 grid place-items-center bg-stone-900/40 px-4" onClick={() => !submitting && onClose()}>
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="adjust-title"
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-sm rounded-lg bg-white p-6 shadow-lg"
      >
        <h2 id="adjust-title" className="text-lg font-semibold">Adjust stock</h2>
        <p className="mt-1 text-sm text-stone-600">
          {product.name} <span className="text-stone-400">({product.sku})</span>
        </p>

        <form onSubmit={onSubmit} noValidate className="mt-4 space-y-4">
          {error && (
            <p role="alert" className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-800">{error}</p>
          )}

          <div>
            <label htmlFor="delta" className="block text-sm font-medium text-stone-700">Change in units</label>
            <input
              ref={inputRef}
              id="delta"
              type="number"
              step={1}
              inputMode="numeric"
              value={delta}
              onChange={(e) => setDelta(e.target.value)}
              aria-describedby="delta-hint"
              className="mt-1 block w-full rounded-md border border-stone-300 px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-teal-600"
            />
            <p id="delta-hint" className="mt-1 text-xs text-stone-500">Use a negative number to remove stock, for example -3.</p>
          </div>

          <p className="text-sm text-stone-700" aria-live="polite">
            On hand: <span className="tabular-nums">{product.quantityOnHand}</span>
            {next !== null && (
              <>
                {" "}→ <span className={`font-semibold tabular-nums ${next < 0 ? "text-red-700" : ""}`}>{next}</span>
              </>
            )}
          </p>

          <div>
            <label htmlFor="adjust-note" className="block text-sm font-medium text-stone-700">Note (optional)</label>
            <input
              id="adjust-note"
              type="text"
              maxLength={200}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="e.g. Received supplier delivery"
              className="mt-1 block w-full rounded-md border border-stone-300 px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-teal-600"
            />
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={onClose} disabled={submitting}
              className="rounded-md border border-stone-300 px-4 py-2 text-sm font-medium hover:bg-stone-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-600">
              Cancel
            </button>
            <button type="submit" disabled={submitting}
              className="rounded-md bg-teal-700 px-4 py-2 text-sm font-medium text-white hover:bg-teal-800 disabled:opacity-60 focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-600 focus-visible:ring-offset-2">
              {submitting ? "Saving..." : "Apply change"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}