import { useEffect, useMemo, useState } from "react";
import PageHeader from "../components/ui/PageHeader";
import Tabs from "../components/ui/Tabs";
import DataTable, { type Column } from "../components/ui/DataTable";
import RowActions from "../components/ui/RowActions";
import Modal from "../components/ui/Modal";
import Toast, { type ToastMessage } from "../components/ui/Toast";
import {
  getIngredients,
  createIngredient,
  updateIngredient,
  deleteIngredient,
  getFoods,
  getRecipesByFood,
  createRecipe,
  updateRecipe,
  deleteRecipe,
  getStockTransactions,
  createStockTransaction,
} from "../services/adminApi";
import { mockIngredients, mockFoods } from "../data/mock";
import { formatNumber, formatDateTime } from "../utils/format";
import type {
  Ingredient,
  Food,
  Recipe,
  StockTransaction,
  TabItem,
  StockTransactionType,
} from "../types";

const TABS: TabItem[] = [
  { key: "ingredients", label: "Nguyên liệu" },
  { key: "recipes", label: "Công thức" },
  { key: "history", label: "Lịch sử kho" },
];

export default function InventoryPage() {
  const [tab, setTab] = useState("ingredients");
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  // Data states
  const [ingredients, setIngredients] = useState<Ingredient[]>([]);
  const [foods, setFoods] = useState<Food[]>([]);
  const [selectedFoodId, setSelectedFoodId] = useState<number>(0);
  const [recipeVersion, setRecipeVersion] = useState(0);
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [transactions, setTransactions] = useState<StockTransaction[]>([]);

  // Search & Filter
  const [searchIng, setSearchIng] = useState("");
  const [filterLowStock, setFilterLowStock] = useState(false);

  // Ingredient Modal
  const [ingModalOpen, setIngModalOpen] = useState(false);
  const [editingIng, setEditingIng] = useState<Ingredient | null>(null);
  const [ingForm, setIngForm] = useState({
    name: "",
    unit: "kg",
    stockQuantity: 10,
    minThreshold: 2,
  });

  // Stock Transaction Modal
  const [stockModalOpen, setStockModalOpen] = useState(false);
  const [stockForm, setStockForm] = useState<{
    ingredientId: number;
    type: StockTransactionType;
    quantity: number;
    note: string;
  }>({
    ingredientId: 0,
    type: "IMPORT",
    quantity: 1,
    note: "",
  });

  // Recipe (BOM) Modal
  const [recipeModalOpen, setRecipeModalOpen] = useState(false);
  const [editingRecipe, setEditingRecipe] = useState<Recipe | null>(null);
  const [recipeForm, setRecipeForm] = useState({
    foodId: 0,
    ingredientId: 0,
    quantityRequired: 0.1,
  });

  const addToast = (type: "success" | "error" | "info", text: string) => {
    setToasts((prev) => [...prev, { id: Date.now(), type, text }]);
  };

  const loadData = async () => {
    try {
      const [ing, f, tx] = await Promise.all([
        getIngredients().catch(() => mockIngredients),
        getFoods().catch(() => mockFoods),
        getStockTransactions().catch(() => []),
      ]);
      setIngredients(ing);
      setFoods(f);

      setTransactions(tx);
    } catch {
      setIngredients(mockIngredients);
      setFoods(mockFoods);

    }
  };

  useEffect(() => {
    let active = true;
    Promise.all([getIngredients().catch(() => mockIngredients), getFoods().catch(() => mockFoods), getStockTransactions().catch(() => [])])
      .then(([ingredients, foods, transactions]) => { if (active) { setIngredients(ingredients); setFoods(foods); setTransactions(transactions); } });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    let active = true;
    const selected = selectedFoodId ? foods.filter(f => f.id === selectedFoodId) : foods;
    Promise.all(selected.map(async food => (await getRecipesByFood(food.id)).map(recipe => ({ ...recipe, food }))))
      .then(data => { if (active) setRecipes(data.flat()); })
      .catch(() => { if (active) setRecipes([]); });
    return () => { active = false; };
  }, [foods, selectedFoodId, recipeVersion]);

  // Filtered ingredients
  const filteredIngredients = useMemo(() => {
    return ingredients.filter((i) => {
      const matchName = i.name.toLowerCase().includes(searchIng.trim().toLowerCase());
      const matchLow = !filterLowStock || i.stockQuantity <= i.minThreshold;
      return matchName && matchLow;
    });
  }, [ingredients, searchIng, filterLowStock]);

  // Ingredient Handlers
  const handleOpenAddIng = () => {
    setEditingIng(null);
    setIngForm({
      name: "",
      unit: "kg",
      stockQuantity: 10,
      minThreshold: 2,
    });
    setIngModalOpen(true);
  };

  const handleOpenEditIng = (ing: Ingredient) => {
    setEditingIng(ing);
    setIngForm({
      name: ing.name,
      unit: ing.unit,
      stockQuantity: ing.stockQuantity,
      minThreshold: ing.minThreshold,
    });
    setIngModalOpen(true);
  };

  const handleSaveIng = async () => {
    if (!ingForm.name.trim()) {
      addToast("error", "Nguyên liệu không được để trống");
      return;
    }
    if (!ingForm.unit.trim()) {
      addToast("error", "Đơn vị không được để trống");
      return;
    }
    try {
      if (editingIng) {
        await updateIngredient(editingIng.id, ingForm);
        addToast("success", `Đã cập nhật nguyên liệu "${ingForm.name}"`);
      } else {
        await createIngredient(ingForm);
        addToast("success", `Đã thêm nguyên liệu "${ingForm.name}"`);
      }
      setIngModalOpen(false);
      loadData();
    } catch {
      if (editingIng) {
        setIngredients((prev) =>
          prev.map((i) => (i.id === editingIng.id ? { ...i, ...ingForm } : i))
        );
      } else {
        setIngredients((prev) => [...prev, { id: Date.now(), ...ingForm }]);
      }
      setIngModalOpen(false);
      addToast("success", "Lưu nguyên liệu thành công (local)");
    }
  };

  const handleDeleteIng = async (ing: Ingredient) => {
    if (!window.confirm(`Xóa nguyên liệu "${ing.name}"?`)) return;
    try {
      await deleteIngredient(ing.id);
      addToast("success", `Đã xóa nguyên liệu "${ing.name}"`);
      loadData();
    } catch {
      setIngredients((prev) => prev.filter((i) => i.id !== ing.id));
      addToast("info", `Đã xóa nguyên liệu "${ing.name}" (local)`);
    }
  };

  // Stock Transaction Handlers
  const handleOpenStockModal = (ing?: Ingredient) => {
    setStockForm({
      ingredientId: ing?.id || ingredients[0]?.id || 0,
      type: "IMPORT",
      quantity: 5,
      note: "",
    });
    setStockModalOpen(true);
  };

  const handleSaveStockTransaction = async () => {
    if (!stockForm.ingredientId) {
      addToast("error", "Vui lòng chọn nguyên liệu");
      return;
    }
    if (stockForm.quantity <= 0) {
      addToast("error", "Số lượng phải lớn hơn 0");
      return;
    }
    try {
      await createStockTransaction(stockForm);
      addToast("success", "Đã ghi nhận giao dịch kho");
      setStockModalOpen(false);
      loadData();
    } catch {
      // Local update
      const targetIng = ingredients.find((i) => i.id === stockForm.ingredientId);
      if (targetIng) {
        let newStock = targetIng.stockQuantity;
        if (stockForm.type === "IMPORT") newStock += stockForm.quantity;
        else if (stockForm.type === "EXPORT") newStock -= stockForm.quantity;
        else newStock = stockForm.quantity;

        setIngredients((prev) =>
          prev.map((i) =>
            i.id === stockForm.ingredientId ? { ...i, stockQuantity: newStock } : i
          )
        );
      }
      setTransactions((prev) => [
        {
          id: Date.now(),
          ingredient: targetIng,
          type: stockForm.type,
          quantity: stockForm.quantity,
          note: stockForm.note,
          createdAt: new Date().toISOString(),
        },
        ...prev,
      ]);
      setStockModalOpen(false);
      addToast("success", "Đã cập nhật kho (local)");
    }
  };

  // Recipe (BOM) Handlers
  const handleOpenAddRecipe = () => {
    setEditingRecipe(null);
    setRecipeForm({
      foodId: selectedFoodId || foods[0]?.id || 0,
      ingredientId: ingredients[0]?.id || 0,
      quantityRequired: 0.2,
    });
    setRecipeModalOpen(true);
  };

  const handleOpenEditRecipe = (r: Recipe) => {
    setEditingRecipe(r);
    setRecipeForm({
      foodId: r.food?.id || selectedFoodId,
      ingredientId: r.ingredient?.id || 0,
      quantityRequired: r.quantityRequired,
    });
    setRecipeModalOpen(true);
  };

  const handleSaveRecipe = async () => {
    if (!recipeForm.ingredientId) {
      addToast("error", "Vui lòng chọn nguyên liệu");
      return;
    }
    if (recipeForm.quantityRequired <= 0) {
      addToast("error", "Số lượng định lượng phải lớn hơn 0");
      return;
    }
    try {
      if (editingRecipe) {
        await updateRecipe(editingRecipe.id, recipeForm);
      } else {
        await createRecipe(recipeForm);
      }
      addToast("success", "Lưu định lượng BOM thành công");
      setRecipeModalOpen(false);
      setRecipeVersion(v => v + 1);
    } catch {
      const ing = ingredients.find((i) => i.id === recipeForm.ingredientId);
      const food = foods.find((f) => f.id === recipeForm.foodId);
      if (editingRecipe) {
        setRecipes((prev) =>
          prev.map((r) =>
            r.id === editingRecipe.id
              ? { ...r, ingredient: ing, quantityRequired: recipeForm.quantityRequired }
              : r
          )
        );
      } else {
        setRecipes((prev) => [
          ...prev,
          {
            id: Date.now(),
            food,
            ingredient: ing,
            quantityRequired: recipeForm.quantityRequired,
          },
        ]);
      }
      setRecipeModalOpen(false);
      addToast("success", "Lưu định lượng BOM thành công (local)");
    }
  };

  const handleDeleteRecipe = async (r: Recipe) => {
    if (!window.confirm(`Xóa định lượng "${r.ingredient?.name}" của món này?`)) return;
    try {
      await deleteRecipe(r.id);
      addToast("success", "Đã xóa định lượng");
      setRecipeVersion(v => v + 1);
    } catch {
      setRecipes((prev) => prev.filter((x) => x.id !== r.id));
      addToast("info", "Đã xóa định lượng (local)");
    }
  };

  // Columns definition
  const ingColumns: Column<Ingredient>[] = [
    { key: "name", header: "Nguyên liệu", className: "strong" },
    { key: "unit", header: "Đơn vị" },
    {
      key: "stockQuantity",
      header: "Tồn kho",
      render: (i) => (
        <span
          className={
            i.stockQuantity <= i.minThreshold
              ? "text-danger strong"
              : "strong"
          }
        >
          {formatNumber(i.stockQuantity)}
        </span>
      ),
    },
    {
      key: "minThreshold",
      header: "Ngưỡng tối thiểu",
      render: (i) => formatNumber(i.minThreshold),
    },
    {
      key: "status",
      header: "Trạng thái",
      render: (i) =>
        i.stockQuantity <= i.minThreshold ? (
          <span className="badge low">Sắp hết</span>
        ) : (
          <span className="badge">Đủ hàng</span>
        ),
    },
  ];

  const recipeColumns: Column<Recipe>[] = [
    { key: "food", header: "Món ăn", className: "strong", render: r => r.food?.name || "—" },
    { key: "ingredient", header: "Nguyên liệu", render: r => r.ingredient?.name || "—" },
    { key: "quantityRequired", header: "Định lượng", render: r => `${formatNumber(r.quantityRequired)} ${r.ingredient?.unit || ""}` },
  ];

  const transColumns: Column<StockTransaction>[] = [
    {
      key: "createdAt",
      header: "Thời gian",
      render: (t) => formatDateTime(t.createdAt),
    },
    {
      key: "ingredient",
      header: "Nguyên liệu",
      className: "strong",
      render: (t) => t.ingredient?.name || "-",
    },
    {
      key: "type",
      header: "Loại",
      render: (t) => {
        if (t.type === "IMPORT")
          return <span className="badge">Nhập kho</span>;
        if (t.type === "EXPORT")
          return <span className="badge badge-neutral">Xuất kho</span>;
        return <span className="badge badge-neutral">Điều chỉnh</span>;
      },
    },
    {
      key: "quantity",
      header: "Số lượng",
      render: (t) => (
        <span className="strong">
          {t.type === "EXPORT" ? "-" : "+"}
          {formatNumber(t.quantity)} {t.ingredient?.unit || ""}
        </span>
      ),
    },
    {
      key: "note",
      header: "Ghi chú",
      render: (t) => <span className="text-muted">{t.note || "-"}</span>,
    },
  ];

  const selectedFood = foods.find((f) => f.id === selectedFoodId);

  return (
    <div className="inventory-page">
      <Toast toasts={toasts} onDismiss={(id) => setToasts((prev) => prev.filter((t) => t.id !== id))} />

      <PageHeader
        title={{ ingredients: "Nguyên liệu", recipes: "Công thức món ăn", history: "Lịch sử kho" }[tab] ?? "Kho"}
        subtitle={{ ingredients: `${ingredients.length} nguyên liệu trong kho`, recipes: "Nguyên liệu cần cho mỗi món", history: "Nhập, xuất và điều chỉnh kho" }[tab]}
      >
        <button
          type="button"
          className="btn-outline"
          onClick={() => handleOpenStockModal()}
        >
          Nhập kho
        </button>
        {tab === "ingredients" && (
          <button type="button" className="btn-primary" onClick={handleOpenAddIng}>
            + Thêm nguyên liệu
          </button>
        )}
        {tab === "recipes" && (
          <button type="button" className="btn-primary" onClick={handleOpenAddRecipe}>
            + Thêm công thức
          </button>
        )}
      </PageHeader>

      <Tabs tabs={TABS} value={tab} onChange={setTab} />

      {/* TAB 1: NGUYÊN LIỆU */}
      {tab === "ingredients" && (
        <>
          <details className="extra-tools"><summary>Tìm kiếm & lọc tồn kho</summary>
          <div className="toolbar">
            <input
              className="field wide"
              placeholder="Tìm nguyên liệu..."
              value={searchIng}
              onChange={(e) => setSearchIng(e.target.value)}
            />
            <button
              type="button"
              className={`btn-outline ${filterLowStock ? "btn-active" : ""}`}
              onClick={() => setFilterLowStock(!filterLowStock)}
            >
              {filterLowStock ? "✓ Đang lọc: Sắp hết hàng" : "Nguyên liệu sắp hết"}
            </button>
          </div>
          </details>

          <DataTable
            columns={ingColumns}
            rows={filteredIngredients}
            empty="Không tìm thấy nguyên liệu nào phù hợp"
            actions={(ing) => (
              <div className="row-actions">
                <RowActions
                  onEdit={() => handleOpenEditIng(ing)}
                  onDelete={() => handleDeleteIng(ing)}
                />
              </div>
            )}
          />
        </>
      )}

      {/* TAB 2: ĐỊNH LƯỢNG MÓN (BOM) */}
      {tab === "recipes" && (
        <>
          <details className="extra-tools"><summary>Lọc theo món ăn</summary>
            <select className="field" aria-label="Lọc công thức theo món ăn" value={selectedFoodId} onChange={e => setSelectedFoodId(Number(e.target.value))}>
              <option value={0}>Tất cả món ăn</option>
              {foods.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
            </select>
          </details>
          <DataTable
            columns={recipeColumns}
            rows={recipes}
            empty={`Món "${selectedFood?.name || "này"}" chưa được khai báo công thức định lượng (BOM).`}
            actions={(r) => (
              <RowActions
                onEdit={() => handleOpenEditRecipe(r)}
                onDelete={() => handleDeleteRecipe(r)}
              />
            )}
          />
        </>
      )}

      {/* TAB 3: LỊCH SỬ KHO */}
      {tab === "history" && (
        <DataTable
          columns={transColumns}
          rows={transactions}
          empty="Chưa có lịch sử nhập/xuất kho nào"
        />
      )}

      {/* MODAL THÊM / SỬA NGUYÊN LIỆU */}
      <Modal
        isOpen={ingModalOpen}
        onClose={() => setIngModalOpen(false)}
        title={editingIng ? "Sửa nguyên liệu" : "Thêm nguyên liệu mới"}
        footer={
          <>
            <button
              type="button"
              className="btn-outline"
              onClick={() => setIngModalOpen(false)}
            >
              Hủy
            </button>
            <button type="button" className="btn-primary" onClick={handleSaveIng}>
              Lưu nguyên liệu
            </button>
          </>
        }
      >
        <div className="form-group">
          <label className="form-label">Nguyên liệu *</label>
          <input
            type="text"
            className="field wide"
            placeholder="Ví dụ: Thịt bò, Mực tươi, Rau xà lách, Sốt tiêu đen..."
            value={ingForm.name}
            onChange={(e) => setIngForm({ ...ingForm, name: e.target.value })}
          />
        </div>

        <div className="form-row">
          <div className="form-group">
            <label className="form-label">Đơn vị *</label>
            <input
              type="text"
              className="field wide"
              placeholder="kg, lít, quả, hộp, gói..."
              value={ingForm.unit}
              onChange={(e) => setIngForm({ ...ingForm, unit: e.target.value })}
            />
          </div>

          <div className="form-group">
            <label className="form-label">Tồn kho ban đầu</label>
            <input
              type="number"
              step="0.1"
              className="field wide"
              value={ingForm.stockQuantity || ""}
              onChange={(e) =>
                setIngForm({ ...ingForm, stockQuantity: Number(e.target.value) })
              }
            />
          </div>
        </div>

        <div className="form-group">
          <label className="form-label">Ngưỡng tối thiểu (Min threshold)</label>
          <input
            type="number"
            step="0.1"
            className="field wide"
            placeholder="2"
            value={ingForm.minThreshold || ""}
            onChange={(e) =>
              setIngForm({ ...ingForm, minThreshold: Number(e.target.value) })
            }
          />
          <p className="form-hint">
            * Khi số lượng tồn thực tế nhỏ hơn hoặc bằng ngưỡng này, hệ thống sẽ tự động bật cảnh báo sắp hết hàng cho Admin.
          </p>
        </div>
      </Modal>

      {/* MODAL GIAO DỊCH KHO */}
      <Modal
        isOpen={stockModalOpen}
        onClose={() => setStockModalOpen(false)}
        title="Ghi nhận Giao dịch Kho"
        footer={
          <>
            <button
              type="button"
              className="btn-outline"
              onClick={() => setStockModalOpen(false)}
            >
              Hủy
            </button>
            <button
              type="button"
              className="btn-primary"
              onClick={handleSaveStockTransaction}
            >
              Xác nhận ghi nhận
            </button>
          </>
        }
      >
        <div className="form-group">
          <label className="form-label">Chọn nguyên liệu *</label>
          <select
            className="field wide"
            value={stockForm.ingredientId}
            onChange={(e) =>
              setStockForm({ ...stockForm, ingredientId: Number(e.target.value) })
            }
          >
            {ingredients.map((i) => (
              <option key={i.id} value={i.id}>
                {i.name} (Tồn hiện tại: {formatNumber(i.stockQuantity)})
              </option>
            ))}
          </select>
        </div>

        <div className="form-row">
          <div className="form-group">
            <label className="form-label">Loại *</label>
            <select
              className="field wide"
              value={stockForm.type}
              onChange={(e) =>
                setStockForm({
                  ...stockForm,
                  type: e.target.value as StockTransactionType,
                })
              }
            >
              <option value="IMPORT">Nhập kho (Tăng số lượng)</option>
              <option value="EXPORT">Xuất kho / Hủy hỏng (Giảm số lượng)</option>
              <option value="ADJUST">Điều chỉnh tăng tồn kho</option>
            </select>
          </div>

          <div className="form-group">
            <label className="form-label">Số lượng *</label>
            <input
              type="number"
              step="0.1"
              min="0.1"
              className="field wide"
              value={stockForm.quantity || ""}
              onChange={(e) =>
                setStockForm({ ...stockForm, quantity: Number(e.target.value) })
              }
            />
          </div>
        </div>

        <div className="form-group">
          <label className="form-label">Lý do / Ghi chú</label>
          <input
            type="text"
            className="field wide"
            placeholder="Ví dụ: Nhập hàng sáng từ NCC Vissan, Hao hụt cuối ngày..."
            value={stockForm.note}
            onChange={(e) => setStockForm({ ...stockForm, note: e.target.value })}
          />
        </div>
      </Modal>

      {/* MODAL ĐỊNH LƯỢNG MÓN (BOM) */}
      <Modal
        isOpen={recipeModalOpen}
        onClose={() => setRecipeModalOpen(false)}
        title={editingRecipe ? "Sửa công thức" : "Thêm công thức"}
        footer={
          <>
            <button
              type="button"
              className="btn-outline"
              onClick={() => setRecipeModalOpen(false)}
            >
              Hủy
            </button>
            <button type="button" className="btn-primary" onClick={handleSaveRecipe}>
              Lưu định lượng
            </button>
          </>
        }
      >
        <div className="form-group"><label className="form-label" htmlFor="recipe-food">Món ăn</label>
          <select id="recipe-food" className="field wide" value={recipeForm.foodId} disabled={!!editingRecipe}
            onChange={e => setRecipeForm({ ...recipeForm, foodId: Number(e.target.value) })}>
            {foods.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
          </select></div>
        <div className="form-group">
          <label className="form-label">Chọn nguyên liệu cần dùng *</label>
          <select
            className="field wide"
            value={recipeForm.ingredientId}
            onChange={(e) =>
              setRecipeForm({ ...recipeForm, ingredientId: Number(e.target.value) })
            }
          >
            {ingredients.map((i) => (
              <option key={i.id} value={i.id}>
                {i.name} ({i.unit})
              </option>
            ))}
          </select>
        </div>

        <div className="form-group">
          <label className="form-label">Số lượng cần cho 1 suất món ăn *</label>
          <input
            type="number"
            step="0.01"
            min="0.01"
            className="field wide"
            placeholder="0.2 (kg) hoặc 200 (gram)..."
            value={recipeForm.quantityRequired || ""}
            onChange={(e) =>
              setRecipeForm({
                ...recipeForm,
                quantityRequired: Number(e.target.value),
              })
            }
          />
          <p className="form-hint">
            * Lưu ý nhập đúng theo đơn vị tính của nguyên liệu đã khai báo.
          </p>
        </div>
      </Modal>
    </div>
  );
}
