import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api, parseApiError } from "../api/client";

type LowStockItem = {
  id: string;
  name: string;
  sku: string;
  quantityOnHand: number;
  effectiveThreshold: number;
};

type DashboardData = {
  totalProducts: number;
  totalUnits: number;
  lowStock: LowStockItem[];
};

const number = new Intl.NumberFormat();

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-stone-200 bg-white p-5">
      <p className="text-sm text-stone-600">{label}</p>
      <p className="mt-1 text-3xl font-semibold tabular-nums tracking-tight">{value}</p>
    </div>
  );
}

export default function Dashboard() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    api
      .get<DashboardData>("/dashboard")
      .then((r) => !cancelled && setData(r.data))
      .catch((err) => !cancelled && setError(parseApiError(err).message));
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div>
      <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>

      {error && (
        <p role="alert" className="mt-4 rounded-md bg-red-50 px-3 py-2 text-sm text-red-800">{error}</p>
      )}
      {!data && !error && <p className="mt-4 text-sm text-stone-500" role="status">Loading dashboard...</p>}

      {data && (
        <>
          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            <StatCard label="Total products" value={number.format(data.totalProducts)} />
            <StatCard label="Units on hand" value={number.format(data.totalUnits)} />
          </div>

          <section className="mt-8" aria-labelledby="low-stock-heading">
            <div className="flex items-baseline justify-between">
              <h2 id="low-stock-heading" className="text-lg font-semibold">Low stock items</h2>
              {data.lowStock.length > 0 && (
                <span className="text-sm text-stone-500">{data.lowStock.length} to restock</span>
              )}
            </div>

            <div className="mt-3 overflow-x-auto rounded-lg border border-stone-200 bg-white">
              {data.totalProducts === 0 ? (
                <div className="p-8 text-center">
                  <p className="text-sm text-stone-600">Add your first product to start tracking stock.</p>
                  <Link to="/products/new" className="mt-2 inline-block text-sm font-medium text-teal-700 hover:underline">
                    Add a product
                  </Link>
                </div>
              ) : data.lowStock.length === 0 ? (
                <p className="p-8 text-center text-sm text-stone-600">Nothing is running low. All products are above their thresholds.</p>
              ) : (
                <table className="w-full text-left text-sm">
                  <thead className="border-b border-stone-200 bg-stone-50 text-stone-600">
                    <tr>
                      <th scope="col" className="px-4 py-3 font-medium">Name</th>
                      <th scope="col" className="px-4 py-3 font-medium">SKU</th>
                      <th scope="col" className="px-4 py-3 text-right font-medium">Quantity on hand</th>
                      <th scope="col" className="px-4 py-3 text-right font-medium">Low stock threshold</th>
                      <th scope="col" className="px-4 py-3 text-right font-medium"><span className="sr-only">Actions</span></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-100">
                    {data.lowStock.map((p) => (
                      <tr key={p.id}>
                        <td className="px-4 py-3 font-medium text-stone-900">{p.name}</td>
                        <td className="px-4 py-3 text-stone-600">{p.sku}</td>
                        <td className={`px-4 py-3 text-right tabular-nums ${p.quantityOnHand === 0 ? "font-semibold text-red-700" : ""}`}>
                          {p.quantityOnHand}
                        </td>
                        <td className="px-4 py-3 text-right tabular-nums">{p.effectiveThreshold}</td>
                        <td className="px-4 py-3 text-right">
                          <Link to={`/products/${p.id}`} className="font-medium text-teal-700 hover:underline">Edit</Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </section>
        </>
      )}
    </div>
  );
}