import { useEffect, useState } from "react";
import PageHeader from "../components/ui/PageHeader";
import { getFoods, getIngredients, getTables } from "../services/adminApi";
import { formatNumber } from "../utils/format";
import type { Ingredient } from "../types";

export default function DashboardPage() {
  const [summary, setSummary] = useState({ foods: 0, ingredients: 0, tables: 0, serving: 0 });
  const [stock, setStock] = useState<Ingredient[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let active = true;
    Promise.all([getFoods(), getIngredients(), getTables()])
      .then(([foods, ingredients, tables]) => {
        if (!active) return;
        setSummary({ foods: foods.length, ingredients: ingredients.length, tables: tables.length,
          serving: tables.filter(table => table.status === "SERVING").length });
        setStock([...ingredients].sort((a, b) => b.stockQuantity - a.stockQuantity).slice(0, 5));
      })
      .catch(() => { if (active) setError("Không thể tải tổng quan nhà hàng. Vui lòng thử lại."); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [attempt]);

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
    <div className="dash-grid">
      <section className="card stock-summary"><h2>Tình trạng tồn kho</h2>
        {loading ? <p className="empty-compact" role="status">Đang tải tồn kho...</p>
          : error ? <p className="empty-compact">Chưa tải được dữ liệu</p>
          : stock.length === 0 ? <p className="empty-compact">Chưa có nguyên liệu</p>
          : stock.map(item => <div className="stock-summary-row" key={item.id}>
            <span>{item.name}</span><span>{formatNumber(item.stockQuantity)} {item.unit}</span></div>)}
      </section>
      <section className="card revenue-placeholder"><h2>Doanh thu</h2><p>Sắp có — chưa có API thống kê</p></section>
    </div>
  </div>;
}
