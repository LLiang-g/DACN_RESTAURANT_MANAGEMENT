import { useEffect, useState } from "react";
import JournalFeed from "../components/admin/JournalFeed";
import LowStockAlert from "../components/admin/LowStockAlert";
import PageHeader from "../components/ui/PageHeader";
import { getFoods, getIngredients, getTables } from "../services/adminApi";
import type { Ingredient } from "../types";
import { subscribeAdminChanges } from "../realtime/adminSocket";

export default function DashboardPage() {
  const [summary, setSummary] = useState({ foods: 0, ingredients: 0, tables: 0, serving: 0 });
  const [stock, setStock] = useState<Ingredient[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [attempt, setAttempt] = useState(0);
  const [refresh, setRefresh] = useState(0);
  useEffect(() => subscribeAdminChanges(() => setRefresh((n) => n + 1)), []);

  useEffect(() => {
    let active = true;
    Promise.all([getFoods(), getIngredients(), getTables()])
      .then(([foods, ingredients, tables]) => {
        if (!active) return;
        setSummary({ foods: foods.length, ingredients: ingredients.length, tables: tables.length,
          serving: tables.filter(table => table.status === "SERVING").length });
        setStock(ingredients);
        setError("");
      })
      .catch(() => { if (active) setError("Không thể tải tổng quan nhà hàng. Vui lòng thử lại."); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [attempt, refresh]);

  return <div className="dashboard-page">
    <PageHeader title="Dashboard" subtitle="Tổng quan hoạt động nhà hàng" />
    {error && <div className="alert alert-danger" role="alert">{error}
      <button className="link edit" onClick={() => { setError(""); setLoading(true); setAttempt(a => a + 1); }}>Thử lại</button>
    </div>}
    <div className="stat-grid" aria-busy={loading}>
      {[["Tổng số món ăn", summary.foods], ["Tổng nguyên liệu", summary.ingredients],
        ["Số bàn", summary.tables], ["Bàn đang phục vụ", summary.serving]].map(([label, value]) =>
        <div className="card stat" key={label}><div className="stat-label">{label}</div>
          <div className="stat-value">{loading || error ? "—" : value}</div></div>)}
    </div>
    <LowStockAlert ingredients={stock} loading={loading} error={!!error} />
    <JournalFeed />
  </div>;
}
