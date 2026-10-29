import { useEffect, useState } from "react";
import {
  getIngredients,
  getRecipesByFood,
  createRecipe,
  updateRecipe,
  deleteRecipe,
} from "../../services/adminApi";
import type { Ingredient, Recipe } from "../../types";

export default function RecipeEditor({ foodId }: { foodId: number }) {
  const [ingredients, setIngredients] = useState<Ingredient[]>([]);
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [ingredientId, setIngredientId] = useState("");
  const [quantity, setQuantity] = useState("");
  const [editing, setEditing] = useState<Recipe | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [revision, setRevision] = useState(0);
  useEffect(() => {
    let active = true;
    Promise.all([getIngredients(), getRecipesByFood(foodId)])
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
  async function save() {
    if (
      !ingredientId ||
      !Number.isFinite(Number(quantity)) ||
      Number(quantity) <= 0
    ) {
      setError("Chọn nguyên liệu và nhập định lượng lớn hơn 0.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      const body = {
        foodId,
        ingredientId: Number(ingredientId),
        quantityRequired: Number(quantity),
      };
      if (editing) await updateRecipe(editing.id, body);
      else await createRecipe(body);
      setEditing(null);
      setIngredientId("");
      setQuantity("");
      setRevision((n) => n + 1);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Không lưu được công thức");
    } finally {
      setBusy(false);
    }
  }
  async function remove(recipe: Recipe) {
    if (!confirm(`Xóa ${recipe.ingredient?.name} khỏi công thức?`)) return;
    setBusy(true);
    setError("");
    try {
      await deleteRecipe(recipe.id);
      setRevision((n) => n + 1);
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
            disabled={!!editing || busy}
            onChange={(e) => setIngredientId(e.target.value)}
          >
            <option value="">Chọn nguyên liệu</option>
            {ingredients
              .filter(
                (i) =>
                  editing || !recipes.some((r) => r.ingredient?.id === i.id),
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
        {editing ? "Lưu định lượng" : "Thêm nguyên liệu"}
      </button>
      {editing && (
        <button
          className="btn-outline"
          onClick={() => {
            setEditing(null);
            setIngredientId("");
            setQuantity("");
          }}
        >
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
          {recipes.map((r) => (
            <tr key={r.id}>
              <td>{r.ingredient?.name}</td>
              <td>
                {r.quantityRequired} {r.ingredient?.unit}
              </td>
              <td>
                <button
                  className="link"
                  disabled={busy}
                  onClick={() => {
                    setEditing(r);
                    setIngredientId(String(r.ingredient?.id));
                    setQuantity(String(r.quantityRequired));
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
      {!recipes.length && (
        <p>
          Chưa có công thức. Thêm nguyên liệu để hệ thống tính tồn kho cho món
          này.
        </p>
      )}
    </section>
  );
}
