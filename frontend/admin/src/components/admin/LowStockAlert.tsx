import "../../styles/dashboard-alerts.css";
import { formatNumber } from "../../utils/format";
import type { Ingredient } from "../../types";

/** Mục cảnh báo nguyên liệu sắp hết (tồn <= ngưỡng), hết hàng xếp trước. */
export default function LowStockAlert({
  ingredients,
  loading,
  error,
}: {
  ingredients: Ingredient[];
  loading: boolean;
  error: boolean;
}) {
  if (loading || error) return null;
  const low = ingredients
    .filter((i) => i.stockQuantity <= i.minThreshold)
    .sort(
      (a, b) =>
        Number(b.stockQuantity <= 0) - Number(a.stockQuantity <= 0) ||
        a.stockQuantity / (a.minThreshold || 1) -
          b.stockQuantity / (b.minThreshold || 1) ||
        a.name.localeCompare(b.name, "vi"),
    );
  if (!low.length) {
    return (
      <section className="low-stock-alert is-ok" role="status">
        ✔ Tồn kho ổn định — không có nguyên liệu nào dưới ngưỡng cảnh báo
      </section>
    );
  }
  const empty = low.filter((i) => i.stockQuantity <= 0).length;
  return (
    <section className="low-stock-alert is-critical" role="alert">
      <div className="low-stock-head">
        <span className="low-stock-icon" aria-hidden="true">⚠</span>
        <strong>
          {low.length} nguyên liệu sắp hết
          {empty ? ` · ${empty} đã HẾT HÀNG` : ""}
        </strong>
        <span className="low-stock-hint">Cần nhập kho ngay</span>
      </div>
      <ul className="low-stock-list">
        {low.map((i) => (
          <li
            key={i.id}
            className={`low-stock-chip${i.stockQuantity <= 0 ? " is-empty" : ""}`}
          >
            {i.name}: {formatNumber(i.stockQuantity)} {i.unit}{" "}
            <small>
              (ngưỡng {formatNumber(i.minThreshold)})
            </small>
          </li>
        ))}
      </ul>
    </section>
  );
}
