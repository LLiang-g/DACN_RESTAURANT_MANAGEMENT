import { useEffect, useState } from "react";
import PageHeader from "../components/ui/PageHeader";
import Modal from "../components/ui/Modal";
import {
  getIngredients,
  createIngredient,
  updateIngredient,
  deleteIngredient,
  getStockTransactions,
  createStockTransaction,
} from "../services/adminApi";
import { formatDateTime, formatNumber } from "../utils/format";
import type {
  Ingredient,
  StockTransaction,
  StockTransactionType,
} from "../types";

export default function InventoryPage() {
  const [ingredients, setIngredients] = useState<Ingredient[]>([]);
  const [transactions, setTransactions] = useState<StockTransaction[]>([]);
  const [tab, setTab] = useState("ingredients");
  const [search, setSearch] = useState("");
  const [low, setLow] = useState(false);
  const [day, setDay] = useState("");
  const [revision, setRevision] = useState(0);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Ingredient | null>(null);
  const [open, setOpen] = useState(false);
  const [stockOpen, setStockOpen] = useState(false);
  const [form, setForm] = useState({
    name: "",
    unit: "kg",
    stockQuantity: 0,
    minThreshold: 0,
  });
  const [stock, setStock] = useState({
    ingredientId: 0,
    type: "IMPORT" as StockTransactionType,
    quantity: 1,
    note: "",
  });
  useEffect(() => {
    let active = true;
    Promise.all([getIngredients(), getStockTransactions()])
      .then(([i, t]) => {
        if (active) {
          setIngredients(i);
          setTransactions(t);
        }
      })
      .catch((e) => {
        if (active) setError(e.message);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [revision]);
  async function saveIngredient() {
    if (
      !form.name.trim() ||
      !form.unit.trim() ||
      form.stockQuantity < 0 ||
      form.minThreshold < 0
    ) {
      setError("Nhập tên, đơn vị và số lượng không âm.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      if (editing) await updateIngredient(editing.id, form);
      else await createIngredient(form);
      setOpen(false);
      setRevision((n) => n + 1);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Không lưu được nguyên liệu");
    } finally {
      setBusy(false);
    }
  }
  async function remove(i: Ingredient) {
    if (!confirm(`Xóa nguyên liệu ${i.name}?`)) return;
    setError("");
    try {
      await deleteIngredient(i.id);
      setRevision((n) => n + 1);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Không xóa được nguyên liệu");
    }
  }
  async function saveStock() {
    if (
      !stock.ingredientId ||
      !Number.isFinite(stock.quantity) ||
      stock.quantity <= 0
    ) {
      setError("Chọn nguyên liệu và số lượng lớn hơn 0.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      await createStockTransaction(stock);
      setStockOpen(false);
      setRevision((n) => n + 1);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Không lưu được giao dịch");
    } finally {
      setBusy(false);
    }
  }
  const rows = ingredients.filter(
    (i) =>
      i.name.toLowerCase().includes(search.toLowerCase()) &&
      (!low || i.stockQuantity <= i.minThreshold),
  );
  const history = [...transactions]
    .filter((t) => !day || t.createdAt?.slice(0, 10) === day)
    .sort(
      (a, b) =>
        (b.createdAt || "").localeCompare(a.createdAt || "") || b.id - a.id,
    );
  return (
    <div>
      <PageHeader
        title="Kho nguyên liệu"
        subtitle="Công thức được quản lý trực tiếp trong từng món ăn"
      >
        <button
          className="btn-outline"
          onClick={() => {
            setError("");
            setStockOpen(true);
          }}
        >
          Ghi nhận giao dịch kho
        </button>
        <button
          className="btn-primary"
          onClick={() => {
            setEditing(null);
            setForm({
              name: "",
              unit: "kg",
              stockQuantity: 0,
              minThreshold: 0,
            });
            setError("");
            setOpen(true);
          }}
        >
          Thêm nguyên liệu
        </button>
      </PageHeader>
      {error && (
        <p role="alert" className="text-danger">
          {error}
        </p>
      )}
      <div className="tabs">
        <button
          className={`tab ${tab === "ingredients" ? "active" : ""}`}
          onClick={() => setTab("ingredients")}
        >
          Nguyên liệu
        </button>
        <button
          className={`tab ${tab === "history" ? "active" : ""}`}
          onClick={() => setTab("history")}
        >
          Lịch sử kho
        </button>
      </div>
      {loading ? (
        <p role="status">Đang tải kho...</p>
      ) : tab === "ingredients" ? (
        <>
          <div className="toolbar">
            <input
              className="field"
              placeholder="Tìm nguyên liệu..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <label>
              <input
                type="checkbox"
                checked={low}
                onChange={(e) => setLow(e.target.checked)}
              />{" "}
              Chỉ tồn kho thấp
            </label>
          </div>
          <div className="card table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>Nguyên liệu</th>
                  <th>Tồn kho</th>
                  <th>Ngưỡng cảnh báo</th>
                  <th>Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((i) => (
                  <tr key={i.id}>
                    <td>{i.name}</td>
                    <td>
                      {formatNumber(i.stockQuantity)} {i.unit}
                      {i.stockQuantity <= i.minThreshold ? " · Tồn thấp" : ""}
                    </td>
                    <td>
                      {i.minThreshold} {i.unit}
                    </td>
                    <td>
                      <button
                        className="link"
                        onClick={() => {
                          setEditing(i);
                          setForm({
                            name: i.name,
                            unit: i.unit,
                            stockQuantity: i.stockQuantity,
                            minThreshold: i.minThreshold,
                          });
                          setError("");
                          setOpen(true);
                        }}
                      >
                        Sửa
                      </button>{" "}
                      <button
                        className="link text-danger"
                        onClick={() => remove(i)}
                      >
                        Xóa
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {!rows.length && (
              <p className="empty">Không có nguyên liệu phù hợp.</p>
            )}
          </div>
        </>
      ) : (
        <>
          <div className="toolbar">
            <label>
              Ngày giao dịch{" "}
              <input
                aria-label="Ngày giao dịch"
                type="date"
                className="field"
                value={day}
                onChange={(e) => setDay(e.target.value)}
              />
            </label>
            <button className="btn-outline" onClick={() => setDay("")}>
              Tất cả ngày
            </button>
          </div>
          <p>{history.length} giao dịch · Mới nhất trước</p>
          <div className="card table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>Thời điểm</th>
                  <th>Nguyên liệu</th>
                  <th>Loại</th>
                  <th>Số lượng</th>
                  <th>Chi tiết</th>
                </tr>
              </thead>
              <tbody>
                {history.map((t) => (
                  <tr key={t.id}>
                    <td>{formatDateTime(t.createdAt)}</td>
                    <td>{t.ingredient?.name}</td>
                    <td>
                      {
                        {
                          IMPORT: "Nhập kho",
                          EXPORT: "Xuất kho",
                          ADJUST: "Điều chỉnh",
                        }[t.type]
                      }
                    </td>
                    <td>
                      {t.quantity} {t.ingredient?.unit}
                    </td>
                    <td>
                      {t.note ||
                        `Giao dịch ${t.quantity} ${t.ingredient?.unit || ""} ${t.ingredient?.name || "nguyên liệu"}`}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {!history.length && (
              <p className="empty">Không có giao dịch trong ngày đã chọn.</p>
            )}
          </div>
        </>
      )}
      <Modal
        isOpen={open}
        onClose={() => setOpen(false)}
        title={editing ? "Sửa nguyên liệu" : "Thêm nguyên liệu"}
        footer={
          <button
            className="btn-primary"
            disabled={busy}
            onClick={saveIngredient}
          >
            Lưu nguyên liệu
          </button>
        }
      >
        {error && (
          <p role="alert" className="text-danger">
            {error}
          </p>
        )}
        <label className="form-group">
          Tên nguyên liệu
          <input
            className="field wide"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
          />
        </label>
        <label className="form-group">
          Đơn vị
          <input
            className="field wide"
            value={form.unit}
            onChange={(e) => setForm({ ...form, unit: e.target.value })}
          />
        </label>
        <label className="form-group">
          Tồn kho
          <input
            className="field wide"
            type="number"
            min="0"
            step="0.001"
            value={form.stockQuantity}
            onChange={(e) =>
              setForm({ ...form, stockQuantity: Number(e.target.value) })
            }
          />
        </label>
        <label className="form-group">
          Ngưỡng tồn thấp
          <input
            className="field wide"
            type="number"
            min="0"
            step="0.001"
            value={form.minThreshold}
            onChange={(e) =>
              setForm({ ...form, minThreshold: Number(e.target.value) })
            }
          />
        </label>
      </Modal>
      <Modal
        isOpen={stockOpen}
        onClose={() => setStockOpen(false)}
        title="Ghi nhận giao dịch kho"
        footer={
          <button className="btn-primary" disabled={busy} onClick={saveStock}>
            Lưu giao dịch
          </button>
        }
      >
        {error && (
          <p role="alert" className="text-danger">
            {error}
          </p>
        )}
        <label className="form-group">
          Nguyên liệu
          <select
            className="field wide"
            value={stock.ingredientId}
            onChange={(e) =>
              setStock({ ...stock, ingredientId: Number(e.target.value) })
            }
          >
            <option value={0}>Chọn nguyên liệu</option>
            {ingredients.map((i) => (
              <option key={i.id} value={i.id}>
                {i.name} ({i.unit})
              </option>
            ))}
          </select>
        </label>
        <label className="form-group">
          Loại giao dịch
          <select
            className="field wide"
            value={stock.type}
            onChange={(e) =>
              setStock({
                ...stock,
                type: e.target.value as StockTransactionType,
              })
            }
          >
            <option value="IMPORT">Nhập kho</option>
            <option value="EXPORT">Xuất kho / Hao hụt</option>
            <option value="ADJUST">Điều chỉnh tăng</option>
          </select>
        </label>
        <label className="form-group">
          Số lượng
          <input
            className="field wide"
            type="number"
            min="0.001"
            step="0.001"
            value={stock.quantity}
            onChange={(e) =>
              setStock({ ...stock, quantity: Number(e.target.value) })
            }
          />
        </label>
        <label className="form-group">
          Ghi chú bổ sung
          <textarea
            className="field wide"
            value={stock.note}
            onChange={(e) => setStock({ ...stock, note: e.target.value })}
          />
        </label>
        <p>
          Hệ thống tự ghi chi tiết nguyên liệu, số lượng và đơn vị kể cả khi để
          trống ghi chú.
        </p>
      </Modal>
    </div>
  );
}
