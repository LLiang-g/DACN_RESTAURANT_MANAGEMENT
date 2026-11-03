import { useEffect, useState } from "react";
import "../../styles/dashboard-alerts.css";
import {
  getOptions,
  createOption,
  updateOption,
  deleteOption,
} from "../../services/adminApi";
import { formatVND } from "../../utils/format";
import { optionPayload, type OptionDraft } from "../../utils/foodOptions";
import type { AdjustType, Ingredient, Option, OptionGroup } from "../../types";

const EMPTY: OptionDraft = {
  name: "",
  groupId: 0,
  ingredientId: 0,
  adjustAmount: 0,
  adjustType: "ADD",
  priceDelta: 0,
  scaleFactor: 1,
};

interface Row {
  key: string;
  form: OptionDraft;
  option?: Option;
}

interface Props {
  /** Có foodId: lưu thẳng vào món. Không có: chỉ chỉnh danh sách tạm `draft`. */
  foodId?: number;
  draft?: OptionDraft[];
  onDraftChange?: (draft: OptionDraft[]) => void;
  optionGroups: OptionGroup[];
  ingredients: Ingredient[];
  onChanged?: () => void;
}

function toForm(o: Option): OptionDraft {
  return {
    name: o.name,
    groupId: o.optionGroup?.id || 0,
    ingredientId: o.ingredient?.id || 0,
    adjustAmount: o.adjustAmount || 0,
    adjustType: o.adjustType || "ADD",
    priceDelta: o.priceDelta || 0,
    scaleFactor: o.scaleFactor || 1,
  };
}

export default function FoodOptionsEditor({
  foodId,
  draft = [],
  onDraftChange,
  optionGroups,
  ingredients,
  onChanged,
}: Props) {
  const persisted = foodId !== undefined;
  const [saved, setSaved] = useState<Option[]>([]);
  const [form, setForm] = useState<OptionDraft>(EMPTY);
  const [editingKey, setEditingKey] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [revision, setRevision] = useState(0);

  useEffect(() => {
    if (foodId === undefined) return;
    let active = true;
    getOptions()
      .then((all) => {
        if (active) setSaved(all.filter((o) => o.food?.id === foodId));
      })
      .catch((e) => {
        if (active) setError(e.message);
      });
    return () => {
      active = false;
    };
  }, [foodId, revision]);

  const rows: Row[] = persisted
    ? saved.map((o) => ({ key: `o${o.id}`, form: toForm(o), option: o }))
    : draft.map((d, index) => ({ key: `d${index}`, form: d }));

  function resetForm() {
    setEditingKey(null);
    setForm({ ...EMPTY, groupId: optionGroups[0]?.id || 0 });
  }

  const groupName = (id: number) => optionGroups.find((g) => g.id === id)?.name || "—";

  async function save(form: OptionDraft) {
    if (!form.name.trim()) {
      setError("Tên option không được để trống.");
      return;
    }
    if (!form.groupId) {
      setError("Chọn nhóm option.");
      return;
    }
    setError("");
    const editing = rows.find((r) => r.key === editingKey);
    if (!persisted) {
      const index = editing ? Number(editing.key.slice(1)) : -1;
      onDraftChange?.(index >= 0 ? draft.map((d, i) => (i === index ? form : d)) : [...draft, form]);
      resetForm();
      return;
    }
    setBusy(true);
    try {
      const body = optionPayload(foodId as number, form);
      if (editing?.option) await updateOption(editing.option.id, body);
      else await createOption(body);
      resetForm();
      setRevision((n) => n + 1);
      onChanged?.();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Không lưu được option");
    } finally {
      setBusy(false);
    }
  }

  async function remove(row: Row) {
    if (!persisted) {
      const index = Number(row.key.slice(1));
      onDraftChange?.(draft.filter((_, i) => i !== index));
      if (editingKey === row.key) resetForm();
      return;
    }
    if (!row.option || !confirm(`Xóa option "${row.form.name}"?`)) return;
    setBusy(true);
    setError("");
    try {
      await deleteOption(row.option.id);
      setRevision((n) => n + 1);
      onChanged?.();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Không xóa được option");
    } finally {
      setBusy(false);
    }
  }

  const groupId = form.groupId || optionGroups[0]?.id || 0;

  return (
    <section className="option-editor">
      <h3>Option của món</h3>
      {error && (
        <p role="alert" className="text-danger">
          {error}
        </p>
      )}
      <div className="form-row">
        <label className="form-group">
          Tên option *
          <input
            className="field wide"
            placeholder="Ví dụ: Size L, Ít cay, Thêm phô mai..."
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
          />
        </label>
        <label className="form-group">
          Nhóm option *
          <select
            className="field wide"
            value={groupId}
            onChange={(e) => setForm({ ...form, groupId: Number(e.target.value) })}
          >
            {!optionGroups.length && <option value={0}>Chưa có nhóm — tạo ở tab "Nhóm option"</option>}
            {optionGroups.map((g) => (
              <option key={g.id} value={g.id}>
                {g.name}
              </option>
            ))}
          </select>
        </label>
      </div>
      <div className="form-row">
        <label className="form-group">
          Chênh lệch giá (VNĐ)
          <input
            className="field wide"
            type="number"
            placeholder="+20000 hoặc 0"
            value={form.priceDelta || ""}
            onChange={(e) => setForm({ ...form, priceDelta: Number(e.target.value) })}
          />
        </label>
        <label className="form-group">
          Hệ số định lượng (scale)
          <input
            className="field wide"
            type="number"
            step="0.1"
            placeholder="1.0"
            value={form.scaleFactor || ""}
            onChange={(e) => setForm({ ...form, scaleFactor: Number(e.target.value) })}
          />
        </label>
      </div>
      <div className="form-row">
        <label className="form-group">
          Điều chỉnh nguyên liệu cụ thể
          <select
            className="field wide"
            value={form.ingredientId}
            onChange={(e) => setForm({ ...form, ingredientId: Number(e.target.value) })}
          >
            <option value={0}>-- Không điều chỉnh nguyên liệu --</option>
            {ingredients.map((i) => (
              <option key={i.id} value={i.id}>
                {i.name} ({i.unit})
              </option>
            ))}
          </select>
        </label>
        <label className="form-group">
          Lượng điều chỉnh
          <div style={{ display: "flex", gap: "8px" }}>
            <select
              className="field"
              style={{ width: "90px" }}
              value={form.adjustType}
              onChange={(e) => setForm({ ...form, adjustType: e.target.value as AdjustType })}
            >
              <option value="ADD">Cộng (+)</option>
              <option value="REMOVE">Trừ (-)</option>
            </select>
            <input
              className="field"
              style={{ flex: 1 }}
              type="number"
              step="0.1"
              placeholder="Số lượng"
              value={form.adjustAmount || ""}
              onChange={(e) => setForm({ ...form, adjustAmount: Number(e.target.value) })}
            />
          </div>
        </label>
      </div>
      <button
        className="btn-primary"
        disabled={busy}
        onClick={() => void save({ ...form, groupId })}
      >
        {editingKey ? "Lưu option" : "Thêm option"}
      </button>
      {editingKey && (
        <button className="btn-outline" onClick={resetForm}>
          Hủy sửa
        </button>
      )}
      <table className="table">
        <thead>
          <tr>
            <th>Option</th>
            <th>Nhóm</th>
            <th>Giá thêm</th>
            <th>Thao tác</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.key}>
              <td>{r.form.name}</td>
              <td>{groupName(r.form.groupId)}</td>
              <td>
                {r.form.priceDelta
                  ? `${r.form.priceDelta > 0 ? "+" : ""}${formatVND(r.form.priceDelta)}`
                  : "—"}
              </td>
              <td>
                <button
                  className="link"
                  disabled={busy}
                  onClick={() => {
                    setEditingKey(r.key);
                    setForm(r.form);
                  }}
                >
                  Sửa
                </button>{" "}
                <button
                  className="link text-danger"
                  disabled={busy}
                  onClick={() => remove(r)}
                >
                  Xóa
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {!rows.length && <p>Món này chưa có option nào.</p>}
    </section>
  );
}
