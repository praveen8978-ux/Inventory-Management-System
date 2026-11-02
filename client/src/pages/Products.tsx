import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api, parseApiError } from "../api/client";
import AdjustStockDialog from "../components/AdjustStockDialog";
import ConfirmDialog from "../components/ConfirmDialog";
import type { Product } from "../types/product";

const priceFormat = new Intl.NumberFormat(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });

function StockBadge({ p }: { p: Product }) {
  if (p.quantityOnHand === 0) {
    return <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-800">Out of stock</span>;
  }
  if (p.isLowStock) {
    return <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-800">Low stock</span>;
  }
  return <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-800">In stock</span>;
}

export default function Products() {
  const [products, setProducts] = useState<Product[] | null>(null);
  const [search, setSearch] = useState("");
  const [query, setQuery] = useState(""); // debounced copy of `search`
  const [error, setError] = useState("");
  const [toDelete, setToDelete] = useState<Product | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [adjusting, setAdjusting] = useState<Product | null>(null);

  useEffect(() => {
    const t = setTimeout(() => setQuery(search.trim()), 300);
    return () => clearTimeout(t);
  }, [search]);

  useEffect(() => {
    let cancelled = false;
    api
      .get<Product[]>("/products", { params: query ? { search: query } : {} })
      .then((r) => {
        if (cancelled) return;
        setError("");
        setProducts(r.data);
      })
      .catch((err) => {
        if (!cancelled) setError(parseApiError(err).message);
      });
    return () => {
      cancelled = true;
    };
  }, [query]);

  const cancelDelete = useCallback(() => setToDelete(null), []);
  const closeAdjust = useCallback(() => setAdjusting(null), []);

  function onAdjusted(updated: Product) {
    setProducts((prev) => prev?.map((p) => (p.id === updated.id ? updated : p)) ?? null);
    setAdjusting(null);
  }

  async function confirmDelete() {
    if (!toDelete) return;
    setDeleting(true);
    try {
      await api.delete(`/products/${toDelete.id}`);
      setProducts((prev) => prev?.filter((p) => p.id !== toDelete.id) ?? null);
      setToDelete(null);
      setError("");
    } catch (err) {
      setError(parseApiError(err).message);
      setToDelete(null);
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold tracking-tight">Products</h1>
        <Link to="/products/new"
          className="rounded-md bg-teal-700 px-4 py-2 text-sm font-medium text-white hover:bg-teal-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-600 focus-visible:ring-offset-2">
          Add product
        </Link>
      </div>

      <div className="mt-5">
        <label htmlFor="search" className="sr-only">Search products</label>
        <input id="search" type="search" value={search} onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by name or SKU"
          className="block w-full max-w-sm rounded-md border border-stone-300 px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-teal-600" />
      </div>

      {error && (
        <p role="alert" className="mt-4 rounded-md bg-red-50 px-3 py-2 text-sm text-red-800">{error}</p>
      )}

      <div className="mt-4 overflow-x-auto rounded-lg border border-stone-200 bg-white">
        {products === null && !error ? (
          <p className="p-6 text-sm text-stone-500" role="status">Loading products...</p>
        ) : products && products.length === 0 ? (
          <div className="p-8 text-center">
            {query ? (
              <p className="text-sm text-stone-600">No products match "{query}". Try a different name or SKU.</p>
            ) : (
              <>
                <p className="text-sm text-stone-600">You haven't added any products yet.</p>
                <Link to="/products/new" className="mt-2 inline-block text-sm font-medium text-teal-700 hover:underline">
                  Add your first product
                </Link>
              </>
            )}
          </div>
        ) : products ? (
          <table className="w-full text-left text-sm">
            <thead className="border-b border-stone-200 bg-stone-50 text-stone-600">
              <tr>
                <th scope="col" className="px-4 py-3 font-medium">Name</th>
                <th scope="col" className="px-4 py-3 font-medium">SKU</th>
                <th scope="col" className="px-4 py-3 text-right font-medium">Quantity</th>
                <th scope="col" className="px-4 py-3 font-medium">Stock</th>
                <th scope="col" className="px-4 py-3 text-right font-medium">Selling price</th>
                <th scope="col" className="px-4 py-3 text-right font-medium"><span className="sr-only">Actions</span></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {products.map((p) => (
                <tr key={p.id}>
                  <td className="px-4 py-3 font-medium text-stone-900">{p.name}</td>
                  <td className="px-4 py-3 text-stone-600">{p.sku}</td>
                  <td className="px-4 py-3 text-right tabular-nums">{p.quantityOnHand}</td>
                  <td className="px-4 py-3"><StockBadge p={p} /></td>
                  <td className="px-4 py-3 text-right tabular-nums">
                    {p.sellingPrice == null ? <span className="text-stone-400">-</span> : priceFormat.format(p.sellingPrice)}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-right">
                    <button onClick={() => setAdjusting(p)} className="mr-4 font-medium text-teal-700 hover:underline">Adjust stock</button>
                    <Link to={`/products/${p.id}`} className="font-medium text-teal-700 hover:underline">Edit</Link>
                    <button onClick={() => setToDelete(p)} className="ml-4 font-medium text-red-700 hover:underline">Delete</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : null}
      </div>

      {adjusting && <AdjustStockDialog product={adjusting} onClose={closeAdjust} onSaved={onAdjusted} />}

      <ConfirmDialog
        open={toDelete !== null}
        title="Delete this product?"
        message={toDelete ? `"${toDelete.name}" (${toDelete.sku}) will be permanently removed. This can't be undone.` : ""}
        confirmLabel="Delete product"
        busy={deleting}
        onConfirm={confirmDelete}
        onCancel={cancelDelete}
      />
    </div>
  );
}