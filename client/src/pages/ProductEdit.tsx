import { useEffect, useState, type FormEvent } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { api, parseApiError } from "../api/client";
import Field from "../components/Field";
import type { Product } from "../types/product";

type Form = {
  name: string;
  sku: string;
  description: string;
  quantityOnHand: string;
  costPrice: string;
  sellingPrice: string;
  lowStockThreshold: string;
};

const emptyForm: Form = {
  name: "",
  sku: "",
  description: "",
  quantityOnHand: "0",
  costPrice: "",
  sellingPrice: "",
  lowStockThreshold: "",
};

const optional = (n: number | null) => (n == null ? "" : String(n));

function validate(f: Form) {
  const errs: Record<string, string> = {};
  if (!f.name.trim()) errs.name = "Name is required";
  if (!f.sku.trim()) errs.sku = "SKU is required";

  const qty = f.quantityOnHand.trim();
  if (qty === "") errs.quantityOnHand = "Enter the quantity on hand (0 if none)";
  else if (!Number.isInteger(Number(qty)) || Number(qty) < 0) errs.quantityOnHand = "Quantity must be a whole number, 0 or more";

  for (const key of ["costPrice", "sellingPrice"] as const) {
    const v = f[key].trim();
    if (v !== "" && (!Number.isFinite(Number(v)) || Number(v) < 0)) errs[key] = "Enter a price of 0 or more";
  }
  const th = f.lowStockThreshold.trim();
  if (th !== "" && (!Number.isInteger(Number(th)) || Number(th) < 0)) errs.lowStockThreshold = "Threshold must be a whole number, 0 or more";
  return errs;
}

function toPayload(f: Form) {
  const num = (s: string) => (s.trim() === "" ? null : Number(s));
  return {
    name: f.name.trim(),
    sku: f.sku.trim(),
    description: f.description.trim() || null,
    quantityOnHand: Number(f.quantityOnHand),
    costPrice: num(f.costPrice),
    sellingPrice: num(f.sellingPrice),
    lowStockThreshold: num(f.lowStockThreshold),
  };
}

export default function ProductEdit() {
  const { id } = useParams();
  const isEdit = Boolean(id);
  const navigate = useNavigate();

  const [form, setForm] = useState<Form>(emptyForm);
  const [loading, setLoading] = useState(isEdit);
  const [loadError, setLoadError] = useState("");
  const [formError, setFormError] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    api
      .get<Product>(`/products/${id}`)
      .then((r) => {
        if (cancelled) return;
        const p = r.data;
        setForm({
          name: p.name,
          sku: p.sku,
          description: p.description ?? "",
          quantityOnHand: String(p.quantityOnHand),
          costPrice: optional(p.costPrice),
          sellingPrice: optional(p.sellingPrice),
          lowStockThreshold: optional(p.lowStockThreshold),
        });
      })
      .catch((err) => {
        if (!cancelled) setLoadError(parseApiError(err).message);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [id]);

  const set = (key: keyof Form) => (e: { target: { value: string } }) =>
    setForm((f) => ({ ...f, [key]: e.target.value }));

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setFormError("");
    setFieldErrors({});

    const errs = validate(form);
    if (Object.keys(errs).length) return setFieldErrors(errs);

    setSubmitting(true);
    try {
      if (id) await api.put(`/products/${id}`, toPayload(form));
      else await api.post("/products", toPayload(form));
      navigate("/products");
    } catch (err) {
      const e2 = parseApiError(err);
      setFormError(e2.message);
      setFieldErrors(e2.fieldErrors);
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) return <p className="text-sm text-stone-500" role="status">Loading product...</p>;
  if (loadError) {
    return (
      <div>
        <p role="alert" className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-800">{loadError}</p>
        <Link to="/products" className="mt-3 inline-block text-sm font-medium text-teal-700 hover:underline">Back to products</Link>
      </div>
    );
  }

  return (
    <div className="max-w-xl">
      <h1 className="text-2xl font-semibold tracking-tight">{isEdit ? "Edit product" : "Add product"}</h1>

      <form onSubmit={onSubmit} noValidate className="mt-6 space-y-4 rounded-lg border border-stone-200 bg-white p-6">
        {formError && (
          <p role="alert" className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-800">{formError}</p>
        )}

        <Field label="Name" name="name" value={form.name} onChange={set("name")} error={fieldErrors.name} />
        <Field label="SKU" name="sku" value={form.sku} onChange={set("sku")} error={fieldErrors.sku}
          hint="Must be unique within your organization" />

        <div>
          <label htmlFor="description" className="block text-sm font-medium text-stone-700">Description (optional)</label>
          <textarea id="description" name="description" rows={3} value={form.description} onChange={set("description")}
            aria-invalid={!!fieldErrors.description}
            className="mt-1 block w-full rounded-md border border-stone-300 px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-teal-600" />
          {fieldErrors.description && <p className="mt-1 text-sm text-red-700">{fieldErrors.description}</p>}
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Quantity on hand" name="quantityOnHand" type="number" min={0} step={1} inputMode="numeric"
            value={form.quantityOnHand} onChange={set("quantityOnHand")} error={fieldErrors.quantityOnHand} />
          <Field label="Low stock threshold (optional)" name="lowStockThreshold" type="number" min={0} step={1} inputMode="numeric"
            value={form.lowStockThreshold} onChange={set("lowStockThreshold")} error={fieldErrors.lowStockThreshold}
            hint="Leave blank to use your organization's default" />
          <Field label="Cost price (optional)" name="costPrice" type="number" min={0} step="0.01" inputMode="decimal"
            value={form.costPrice} onChange={set("costPrice")} error={fieldErrors.costPrice} />
          <Field label="Selling price (optional)" name="sellingPrice" type="number" min={0} step="0.01" inputMode="decimal"
            value={form.sellingPrice} onChange={set("sellingPrice")} error={fieldErrors.sellingPrice} />
        </div>

        <div className="flex items-center gap-3 pt-2">
          <button type="submit" disabled={submitting}
            className="rounded-md bg-teal-700 px-4 py-2 text-sm font-medium text-white hover:bg-teal-800 disabled:opacity-60 focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-600 focus-visible:ring-offset-2">
            {submitting ? "Saving..." : "Save product"}
          </button>
          <Link to="/products" className="rounded-md px-4 py-2 text-sm font-medium text-stone-700 hover:bg-stone-100">Cancel</Link>
        </div>
      </form>
    </div>
  );
}