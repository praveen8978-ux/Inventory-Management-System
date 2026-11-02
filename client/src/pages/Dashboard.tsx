import { useAuth } from "../context/AuthContext";

// Placeholder: summary cards and the low-stock table arrive in Hour 3:30.
export default function Dashboard() {
  const { user } = useAuth();
  return (
    <div>
      <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
      <p className="mt-2 text-stone-600">
        You're signed in to <strong>{user?.organization.name}</strong>. Your inventory summary will appear here once
        products are added.
      </p>
    </div>
  );
}