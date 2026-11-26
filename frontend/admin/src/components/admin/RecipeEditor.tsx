import { useEffect, useState } from "react";
import {
  getIngredients,
  getRecipesByFood,
  createRecipe,
  updateRecipe,
  deleteRecipe,
} from "../../services/adminApi";
import type { Ingredient, Recipe } from "../../types";

/** Dòng công thức tạm khi món chưa được lưu (chưa có foodId). */
export interface RecipeDraft {
  ingredientId: number;
  quantityRequired: number;
}

interface Row {
  key: string;
  ingredientId: number;
  name: string;
  unit: string;
  quantity: number;
  recipe?: Recipe;
}

interface Props {
  /** Có foodId: lưu thẳng vào món. Không có: chỉ chỉnh danh sách tạm `draft`. */
  foodId?: number;
  draft?: RecipeDraft[];
  onDraftChange?: (draft: RecipeDraft[]) => void;
  onChanged?: () => void;
}

export default function RecipeEditor({ foodId, draft = [], onDraftChange, onChanged }: Props) {
  const persisted = foodId !== undefined;
  const [ingredients, setIngredients] = useState<Ingredient[]>([]);
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [ingredientId, setIngredientId] = useState("");
  const [quantity, setQuantity] = useState("");
  const [editingKey, setEditingKey] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [revision, setRevision] = useState(0);

  useEffect(() => {
    let active = true;
    Promise.all([
      getIngredients(),
      foodId !== undefined ? getRecipesByFood(foodId) : Promise.resolve([] as Recipe[]),
    ])
      .then(([i, r]) => {
        if (active) {
          setIngredients(i);
          setRecipes(r);
        }
      })
      .catch((e) => {
        if (active) setError(e.message);
      });
    return () => {
      active = false;
    };
  }, [foodId, revision]);

  const rows: Row[] = persisted
    ? recipes.map((r) => ({
        key: `r${r.id}`,
        ingredientId: r.ingredient?.id ?? 0,
        name: r.ingredient?.name ?? "",
        unit: r.ingredient?.unit ?? "",
        quantity: r.quantityRequired,
        recipe: r,
      }))
    : draft.map((d, index) => {
        const ing = ingredients.find((i) => i.id === d.ingredientId);
        return {
          key: `d${index}`,
          ingredientId: d.ingredientId,
          name: ing?.name ?? `Nguyên liệu #${d.ingredientId}`,
          unit: ing?.unit ?? "",
          quantity: d.quantityRequired,
        };
      });

  function resetForm() {
    setEditingKey(null);
    setIngredientId("");
    setQuantity("");
  }

  async function save() {
    if (
      !ingredientId ||
      !Number.isFinite(Number(quantity)) ||
      Number(quantity) <= 0
    ) {
      setError("Chọn nguyên liệu và nhập định lượng lớn hơn 0.");
      return;
    }
    setError("");
    const editing = rows.find((r) => r.key === editingKey);
    if (!persisted) {
      const line = { ingredientId: Number(ingredientId), quantityRequired: Number(quantity) };
      const index = editing ? Number(editing.key.slice(1)) : -1;
      onDraftChange?.(index >= 0 ? draft.map((d, i) => (i === index ? line : d)) : [...draft, line]);
      resetForm();
      return;
    }
    setBusy(true);
    try {
      const body = {
        foodId: foodId as number,
        ingredientId: Number(ingredientId),
        quantityRequired: Number(quantity),
      };
      if (editing?.recipe) await updateRecipe(editing.recipe.id, body);
      else await createRecipe(body);
      resetForm();
      setRevision((n) => n + 1);
      onChanged?.();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Không lưu được công thức");
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
    if (!row.recipe || !confirm(`Xóa ${row.name} khỏi công thức?`)) return;
    setBusy(true);
    setError("");
    try {
      await deleteRecipe(row.recipe.id);
      setRevision((n) => n + 1);
      onChanged?.();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Không xóa được công thức");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="recipe-editor">
      <h3>Công thức món ăn</h3>
      {error && (
        <p role="alert" className="text-danger">
          {error}
        </p>
      )}
      <div className="form-row">
        <label className="form-group">
          Nguyên liệu
          <select
            className="field wide"
            value={ingredientId}
            disabled={!!editingKey || busy}
            onChange={(e) => setIngredientId(e.target.value)}
          >
            <option value="">Chọn nguyên liệu</option>
            {ingredients
              .filter(
                (i) => editingKey || !rows.some((r) => r.ingredientId === i.id),
              )
              .map((i) => (
                <option key={i.id} value={i.id}>
                  {i.name} ({i.unit})
                </option>
              ))}
          </select>
        </label>
        <label className="form-group">
          Định lượng mỗi phần (
          {ingredients.find((i) => i.id === Number(ingredientId))?.unit ||
            "đơn vị nguyên liệu"}
          )
          <input
            className="field wide"
            type="number"
            min="0.001"
            step="0.001"
            value={quantity}
            onChange={(e) => setQuantity(e.target.value)}
          />
        </label>
      </div>
      <button className="btn-primary" disabled={busy} onClick={save}>
        {editingKey ? "Lưu định lượng" : "Thêm nguyên liệu"}
      </button>
      {editingKey && (
        <button className="btn-outline" onClick={resetForm}>
          Hủy sửa
        </button>
      )}
      <table className="table">
        <thead>
          <tr>
            <th>Nguyên liệu</th>
            <th>Định lượng/phần</th>
            <th>Thao tác</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.key}>
              <td>{r.name}</td>
              <td>
                {r.quantity} {r.unit}
              </td>
              <td>
                <button
                  className="link"
                  disabled={busy}
                  onClick={() => {
                    setEditingKey(r.key);
                    setIngredientId(String(r.ingredientId));
                    setQuantity(String(r.quantity));
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
      {!rows.length && (
        <p>
          Chưa có công thức. Thêm nguyên liệu để hệ thống tính tồn kho cho món
          này.
        </p>
      )}
    </section>
  );
}
