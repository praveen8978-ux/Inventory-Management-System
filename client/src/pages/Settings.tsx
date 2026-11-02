import { useEffect, useState, type FormEvent } from "react";
import { api, parseApiError } from "../api/client";
import Field from "../components/Field";

export default function Settings() {
  const [value, setValue] = useState("");
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [formError, setFormError] = useState("");
  const [fieldError, setFieldError] = useState("");
  const [saved, setSaved] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    let cancelled = false;
    api
      .get<{ defaultLowStockThreshold: number }>("/settings")
      .then((r) => !cancelled && setValue(String(r.data.defaultLowStockThreshold)))
      .catch((err) => !cancelled && setLoadError(parseApiError(err).message))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, []);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setSaved(false);
    setFormError("");
    setFieldError("");

    const v = value.trim();
    if (v === "" || !Number.isInteger(Number(v)) || Number(v) < 0) {
      return setFieldError("Enter a whole number, 0 or more");
    }

    setSubmitting(true);
    try {
      await api.put("/settings", { defaultLowStockThreshold: Number(v) });
      setSaved(true);
    } catch (err) {
      const e2 = parseApiError(err);
      setFormError(e2.message);
      setFieldError(e2.fieldErrors.defaultLowStockThreshold ?? "");
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) return <p className="text-sm text-stone-500" role="status">Loading settings...</p>;

  return (
    <div className="max-w-xl">
      <h1 className="text-2xl font-semibold tracking-tight">Settings</h1>

      {loadError ? (
        <p role="alert" className="mt-4 rounded-md bg-red-50 px-3 py-2 text-sm text-red-800">{loadError}</p>
      ) : (
        <form onSubmit={onSubmit} noValidate className="mt-6 space-y-4 rounded-lg border border-stone-200 bg-white p-6">
          {formError && (
            <p role="alert" className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-800">{formError}</p>
          )}
          {saved && (
            <p role="status" className="rounded-md bg-emerald-50 px-3 py-2 text-sm text-emerald-800">Settings saved.</p>
          )}

          <Field
            label="Default low stock threshold"
            name="defaultLowStockThreshold"
            type="number"
            min={0}
            step={1}
            inputMode="numeric"
            value={value}
            onChange={(e) => {
              setValue(e.target.value);
              setSaved(false);
            }}
            error={fieldError}
            hint="A product is low on stock when its quantity is at or below this number. Products with their own threshold ignore it."
          />

          <button type="submit" disabled={submitting}
            className="rounded-md bg-teal-700 px-4 py-2 text-sm font-medium text-white hover:bg-teal-800 disabled:opacity-60 focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-600 focus-visible:ring-offset-2">
            {submitting ? "Saving..." : "Save settings"}
          </button>
        </form>
      )}
    </div>
  );
}