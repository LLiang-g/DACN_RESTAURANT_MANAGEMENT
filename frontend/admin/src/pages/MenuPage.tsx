import { useEffect, useMemo, useState } from "react";
import RecipeEditor, { type RecipeDraft } from "../components/admin/RecipeEditor";
import FoodOptionsEditor from "../components/admin/FoodOptionsEditor";
import { optionPayload, type OptionDraft } from "../utils/foodOptions";
import PageHeader from "../components/ui/PageHeader";
import Tabs from "../components/ui/Tabs";
import DataTable, { type Column } from "../components/ui/DataTable";
import RowActions from "../components/ui/RowActions";
import Modal from "../components/ui/Modal";
import Toast, { type ToastMessage } from "../components/ui/Toast";
import {
  uploadFoodImage,
  getFoods,
  createFood,
  updateFood,
  deleteFood,
  getCategories,
  createCategory,
  updateCategory,
  deleteCategory,
  getKitchenStations,
  getOptionGroups,
  createOptionGroup,
  updateOptionGroup,
  deleteOptionGroup,
  getOptions,
  createOption,
  getCombos,
  createCombo,
  updateCombo,
  deleteCombo,
  getComboItems,
  addComboItem,
  deleteComboItem,
  getIngredients,
  createRecipe,
} from "../services/adminApi";

import { formatVND } from "../utils/format";
import type {
  Food,
  Category,
  KitchenStation,
  OptionGroup,
  Option,
  Combo,
  ComboItem,
  Ingredient,
  TabItem,
  DiscountType,
  SelectionType,
} from "../types";

const TABS: TabItem[] = [
  { key: "dishes", label: "Món ăn" },
  { key: "categories", label: "Danh mục" },
  { key: "optionGroups", label: "Nhóm option" },
  { key: "combos", label: "Combo" },
];

export default function MenuPage() {
  const [uploading, setUploading] = useState(false);
  // Công thức / option nhập sẵn trong form thêm món (lưu cùng lúc khi bấm Lưu món)
  const [draftRecipes, setDraftRecipes] = useState<RecipeDraft[]>([]);
  const [draftOptions, setDraftOptions] = useState<OptionDraft[]>([]);
  const [tab, setTab] = useState("dishes");
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  // Data states
  const [foods, setFoods] = useState<Food[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [stations, setStations] = useState<KitchenStation[]>([]);
  const [optionGroups, setOptionGroups] = useState<OptionGroup[]>([]);
  const [options, setOptions] = useState<Option[]>([]);
  const [combos, setCombos] = useState<Combo[]>([]);
  const [ingredients, setIngredients] = useState<Ingredient[]>([]);

  // Search & Filters
  const [searchFood, setSearchFood] = useState("");
  const [filterCategory, setFilterCategory] = useState<string>("");

  // Modals state
  const [foodModalOpen, setFoodModalOpen] = useState(false);
  const [editingFood, setEditingFood] = useState<Food | null>(null);
  const [foodForm, setFoodForm] = useState({
    name: "",
    categoryId: 0,
    price: 0,
    image: "",
    description: "",
    estimatedCookingTime: 15,
  });

  const [categoryModalOpen, setCategoryModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [categoryForm, setCategoryForm] = useState({
    name: "",
    stationId: 0,
  });

  const [groupModalOpen, setGroupModalOpen] = useState(false);
  const [editingGroup, setEditingGroup] = useState<OptionGroup | null>(null);
  const [groupForm, setGroupForm] = useState<{
    name: string;
    selectionType: SelectionType;
  }>({
    name: "",
    selectionType: "SINGLE_CHOICE",
  });

  const [comboModalOpen, setComboModalOpen] = useState(false);
  const [editingCombo, setEditingCombo] = useState<Combo | null>(null);
  const [comboForm, setComboForm] = useState<{
    name: string;
    discountType: DiscountType;
    discountValue: number;
  }>({
    name: "",
    discountType: "PERCENT",
    discountValue: 10,
  });

  // Combo Items Modal
  const [comboItemsModalOpen, setComboItemsModalOpen] = useState(false);
  const [selectedComboForItems, setSelectedComboForItems] = useState<Combo | null>(null);
  const [comboCounts, setComboCounts] = useState<Record<number, number>>({});
  const [comboItems, setComboItems] = useState<ComboItem[]>([]);
  const [newComboItemFoodId, setNewComboItemFoodId] = useState<number>(0);
  const [newComboItemQuantity, setNewComboItemQuantity] = useState<number>(1);

  const addToast = (type: "success" | "error" | "info", text: string) => {
    setToasts((prev) => [...prev, { id: Date.now(), type, text }]);
  };

  // Load initial data
  const loadAll = async () => {
    try {
      const [f, c, s, og, opt, cb, ing] = await Promise.all([
        getFoods().catch(error => { addToast("error", error.message); return []; }),
        getCategories().catch(error => { addToast("error", error.message); return []; }),
        getKitchenStations().catch(error => { addToast("error", error.message); return []; }),
        getOptionGroups().catch(error => { addToast("error", error.message); return []; }),
        getOptions().catch(error => { addToast("error", error.message); return []; }),
        getCombos().catch(error => { addToast("error", error.message); return []; }),
        getIngredients().catch(error => { addToast("error", error.message); return []; }),
      ]);
      setFoods(f);
      setCategories(c);
      setStations(s);
      setOptionGroups(og);
      setOptions(opt);
      setCombos(cb);
      const counts = await Promise.all(cb.map(async combo => {
        try { return [combo.id, (await getComboItems(combo.id)).length] as const; }
        catch { return [combo.id, undefined] as const; }
      }));
      setComboCounts(Object.fromEntries(counts.filter(([, count]) => count !== undefined)) as Record<number, number>);
      setIngredients(ing);
    } catch (error) { addToast("error", error instanceof Error ? error.message : "Không tải/lưu được dữ liệu. Vui lòng thử lại."); }
  };

  useEffect(() => {
    let active = true;
    Promise.all([getFoods().catch(error => { addToast("error", error.message); return []; }), getCategories().catch(error => { addToast("error", error.message); return []; }),
      getKitchenStations().catch(error => { addToast("error", error.message); return []; }), getOptionGroups().catch(error => { addToast("error", error.message); return []; }),
      getOptions().catch(error => { addToast("error", error.message); return []; }), getCombos().catch(error => { addToast("error", error.message); return []; }), getIngredients().catch(error => { addToast("error", error.message); return []; })])
      .then(async ([foods, categories, stations, groups, options, combos, ingredients]) => {
        if (!active) return;
        setFoods(foods); setCategories(categories); setStations(stations); setOptionGroups(groups);
        setOptions(options); setCombos(combos); setIngredients(ingredients);
        const counts = await Promise.all(combos.map(async combo => {
          try { return [combo.id, (await getComboItems(combo.id)).length] as const; }
          catch { return [combo.id, undefined] as const; }
        }));
        if (active) setComboCounts(Object.fromEntries(counts.filter(([, count]) => count !== undefined)) as Record<number, number>);
      });
    return () => { active = false; };
  }, []);

  // Filtered foods
  const filteredFoods = useMemo(() => {
    return foods.filter((f) => {
      const matchName = f.name.toLowerCase().includes(searchFood.trim().toLowerCase());
      const matchCat =
        !filterCategory ||
        f.category?.id?.toString() === filterCategory ||
        f.category?.name === filterCategory;
      return matchName && matchCat;
    });
  }, [foods, searchFood, filterCategory]);

  // Food handlers
  const handleOpenAddFood = () => {
    setEditingFood(null);
    setDraftRecipes([]);
    setDraftOptions([]);
    setFoodForm({
      name: "",
      categoryId: categories[0]?.id || 0,
      price: 50000,
      image: "",
      description: "",
      estimatedCookingTime: 15,
    });
    setFoodModalOpen(true);
  };

  const handleOpenEditFood = (food: Food) => {
    setEditingFood(food);
    setDraftRecipes([]);
    setDraftOptions([]);
    setFoodForm({
      name: food.name,
      categoryId: food.category?.id || 0,
      price: food.price,
      image: food.image || "",
      description: food.description || "",
      estimatedCookingTime: food.estimatedCookingTime || 15,
    });
    setFoodModalOpen(true);
  };

  const handleSaveFood = async () => {
    if (!foodForm.name.trim()) {
      addToast("error", "Tên món ăn không được để trống");
      return;
    }
    if (foodForm.price <= 0) {
      addToast("error", "Giá món ăn phải lớn hơn 0");
      return;
    }
    try {
      if (editingFood) {
        await updateFood(editingFood.id, foodForm);
        addToast("success", `Đã cập nhật món "${foodForm.name}"`);
      } else {
        const saved = await createFood(foodForm);
        const failed: string[] = [];
        for (const line of draftRecipes) {
          try {
            await createRecipe({ foodId: saved.id, ingredientId: line.ingredientId, quantityRequired: line.quantityRequired });
          } catch {
            failed.push(`nguyên liệu ${ingredients.find(i => i.id === line.ingredientId)?.name ?? `#${line.ingredientId}`}`);
          }
        }
        for (const option of draftOptions) {
          try {
            await createOption(optionPayload(saved.id, option));
          } catch {
            failed.push(`option ${option.name}`);
          }
        }
        setDraftRecipes([]);
        setDraftOptions([]);
        if (failed.length) {
          // Món đã tạo nhưng thiếu một số phần: giữ form mở ở chế độ sửa để bổ sung
          setEditingFood(saved);
          addToast("error", `Đã tạo món "${foodForm.name}" nhưng chưa lưu được: ${failed.join(", ")}. Hãy thêm lại trong form.`);
        } else {
          setFoodModalOpen(false);
          addToast("success", `Đã thêm món "${foodForm.name}" thành công`);
        }
      }
      loadAll();
    } catch (error) { addToast("error", error instanceof Error ? error.message : "Không lưu được thay đổi. Vui lòng thử lại."); }
  };

  const handleDeleteFood = async (food: Food) => {
    if (!window.confirm(`Xóa món "${food.name}" khỏi thực đơn?`)) return;
    try {
      await deleteFood(food.id);
      addToast("success", `Đã xóa món "${food.name}"`);
      loadAll();
    } catch (error) { addToast("error", error instanceof Error ? error.message : "Không lưu được thay đổi. Vui lòng thử lại."); }
  };

  // Category Handlers
  const handleOpenAddCategory = () => {
    setEditingCategory(null);
    setCategoryForm({ name: "", stationId: stations[0]?.id || 0 });
    setCategoryModalOpen(true);
  };

  const handleOpenEditCategory = (cat: Category) => {
    setEditingCategory(cat);
    setCategoryForm({
      name: cat.name,
      stationId: cat.kitchenStation?.id || 0,
    });
    setCategoryModalOpen(true);
  };

  const handleSaveCategory = async () => {
    if (!categoryForm.name.trim()) {
      addToast("error", "Tên danh mục không được để trống");
      return;
    }
    try {
      if (editingCategory) {
        await updateCategory(editingCategory.id, categoryForm);
        addToast("success", "Cập nhật danh mục thành công");
      } else {
        await createCategory(categoryForm);
        addToast("success", "Thêm danh mục mới thành công");
      }
      setCategoryModalOpen(false);
      loadAll();
    } catch (error) { addToast("error", error instanceof Error ? error.message : "Không lưu được thay đổi. Vui lòng thử lại."); }
  };

  const handleDeleteCategory = async (cat: Category) => {
    if (!window.confirm(`Xóa danh mục "${cat.name}"?`)) return;
    try {
      await deleteCategory(cat.id);
      addToast("success", `Đã xóa danh mục "${cat.name}"`);
      loadAll();
    } catch (error) { addToast("error", error instanceof Error ? error.message : "Không lưu được thay đổi. Vui lòng thử lại."); }
  };

  // Option Group Handlers
  const handleOpenAddGroup = () => {
    setEditingGroup(null);
    setGroupForm({ name: "", selectionType: "SINGLE_CHOICE" });
    setGroupModalOpen(true);
  };

  const handleOpenEditGroup = (g: OptionGroup) => {
    setEditingGroup(g);
    setGroupForm({ name: g.name, selectionType: g.selectionType });
    setGroupModalOpen(true);
  };

  const handleSaveGroup = async () => {
    if (!groupForm.name.trim()) {
      addToast("error", "Tên nhóm tùy chọn không được để trống");
      return;
    }
    try {
      if (editingGroup) {
        await updateOptionGroup(editingGroup.id, groupForm);
      } else {
        await createOptionGroup(groupForm);
      }
      setGroupModalOpen(false);
      loadAll();
      addToast("success", "Lưu nhóm tùy chọn thành công");
    } catch (error) { addToast("error", error instanceof Error ? error.message : "Không lưu được thay đổi. Vui lòng thử lại."); }
  };

  const handleDeleteGroup = async (g: OptionGroup) => {
    if (!window.confirm(`Xóa nhóm tùy chọn "${g.name}"?`)) return;
    try {
      await deleteOptionGroup(g.id);
      loadAll();
    } catch (error) { addToast("error", error instanceof Error ? error.message : "Không tải/lưu được dữ liệu. Vui lòng thử lại."); }
  };

  // Combo Handlers
  const handleOpenAddCombo = () => {
    setEditingCombo(null);
    setComboForm({ name: "", discountType: "PERCENT", discountValue: 10 });
    setComboModalOpen(true);
  };

  const handleOpenEditCombo = (c: Combo) => {
    setEditingCombo(c);
    setComboForm({
      name: c.name,
      discountType: c.discountType,
      discountValue: c.discountValue,
    });
    setComboModalOpen(true);
  };

  const handleSaveCombo = async () => {
    if (!comboForm.name.trim()) {
      addToast("error", "Tên Combo không được để trống");
      return;
    }
    try {
      if (editingCombo) {
        await updateCombo(editingCombo.id, comboForm);
      } else {
        await createCombo(comboForm);
      }
      setComboModalOpen(false);
      loadAll();
      addToast("success", "Lưu Combo thành công");
    } catch (error) { addToast("error", error instanceof Error ? error.message : "Không lưu được thay đổi. Vui lòng thử lại."); }
  };

  const handleDeleteCombo = async (c: Combo) => {
    if (!window.confirm(`Xóa Combo "${c.name}"?`)) return;
    try {
      await deleteCombo(c.id);
      loadAll();
    } catch (error) { addToast("error", error instanceof Error ? error.message : "Không tải/lưu được dữ liệu. Vui lòng thử lại."); }
  };

  // Open Combo Items
  const handleOpenComboItems = async (c: Combo) => {
    setSelectedComboForItems(c);
    setNewComboItemFoodId(foods[0]?.id || 0);
    setNewComboItemQuantity(1);
    setComboItemsModalOpen(true);
    try {
      const items = await getComboItems(c.id);
      setComboItems(items);
    } catch (error) { addToast("error", error instanceof Error ? error.message : "Không tải/lưu được dữ liệu. Vui lòng thử lại."); }
  };

  const handleAddComboItem = async () => {
    if (!selectedComboForItems || newComboItemFoodId === 0) return;
    if (!Number.isInteger(newComboItemQuantity) || newComboItemQuantity < 1) { addToast("error", "Số lượng phải là số nguyên dương"); return; }
    try {
      await addComboItem(selectedComboForItems.id, {
        foodId: newComboItemFoodId,
        quantity: newComboItemQuantity,
      });
      const items = await getComboItems(selectedComboForItems.id);
      setComboItems(items);
      setComboCounts((prev) => ({ ...prev, [selectedComboForItems.id]: items.length }));
      loadAll();
      addToast("success", "Đã thêm món vào combo");
    } catch (error) { addToast("error", error instanceof Error ? error.message : "Không lưu được thay đổi. Vui lòng thử lại."); }
  };

  const handleDeleteComboItem = async (foodId: number) => {
    if (!selectedComboForItems) return;
    try {
      await deleteComboItem(selectedComboForItems.id, foodId);
      const items = await getComboItems(selectedComboForItems.id);
      setComboItems(items);
      setComboCounts((prev) => ({ ...prev, [selectedComboForItems.id]: items.length }));
      addToast("success", "Đã xóa món khỏi combo");
    } catch (error) { addToast("error", error instanceof Error ? error.message : "Không lưu được thay đổi. Vui lòng thử lại."); }
  };

  // Table Columns Definitions
  const foodColumns: Column<Food>[] = [
    { key: "name", header: "Tên món", className: "strong" },
    { key: "category", header: "Danh mục", render: f => f.category?.name || "—" },
    { key: "station", header: "Khu bếp", render: f => categories.find(c => c.id === f.category?.id)?.kitchenStation?.name || "—" },
    { key: "price", header: "Giá", render: f => formatVND(f.price) },
    { key: "estimatedCookingTime", header: "Thời gian nấu", render: f => `${f.estimatedCookingTime ?? 15} phút` },
  ];
  const categoryColumns: Column<Category>[] = [
    { key: "name", header: "Tên danh mục", className: "strong" },
    { key: "kitchenStation", header: "Khu bếp", render: c => c.kitchenStation?.name || "—" },
    { key: "count", header: "Số món", render: c => foods.filter(f => f.category?.id === c.id).length },
  ];
  const groupColumns: Column<OptionGroup>[] = [
    { key: "name", header: "Tên nhóm", className: "strong" },
    { key: "selectionType", header: "Kiểu chọn", render: g => <span className="badge">{g.selectionType === "SINGLE_CHOICE" ? "Chọn một" : "Chọn nhiều"}</span> },
    { key: "count", header: "Số option", render: g => options.filter(o => o.optionGroup?.id === g.id).length },
  ];
  const comboColumns: Column<Combo>[] = [
    { key: "name", header: "Tên combo", className: "strong" },
    { key: "discount", header: "Mức giảm giá", render: c => c.discountType === "PERCENT" ? `Giảm ${c.discountValue}%` : `Giảm ${formatVND(c.discountValue)}` },
    { key: "count", header: "Số món", render: c => <button className="combo-count" onClick={() => handleOpenComboItems(c)} title="Xem và quản lý món trong combo">Quản lý món ({comboCounts[c.id] ?? "—"})</button> },
  ];

  return (
    <div className="menu-page">
      <Toast toasts={toasts} onDismiss={(id) => setToasts((prev) => prev.filter((t) => t.id !== id))} />

      <PageHeader
        title={{ dishes: "Món ăn", categories: "Danh mục món", optionGroups: "Nhóm option", combos: "Combo" }[tab] ?? "Thực đơn"}
        subtitle={{ dishes: `${foods.length} món trong thực đơn`, categories: `${categories.length} danh mục`, optionGroups: `${optionGroups.length} nhóm`, combos: `${combos.length} combo` }[tab]}
      >
        {tab === "dishes" && (
          <button type="button" className="btn-primary" onClick={handleOpenAddFood}>
            + Thêm món
          </button>
        )}
        {tab === "categories" && (
          <button type="button" className="btn-primary" onClick={handleOpenAddCategory}>
            + Thêm danh mục
          </button>
        )}
        {tab === "optionGroups" && (
          <button type="button" className="btn-primary" onClick={handleOpenAddGroup}>
            + Thêm nhóm
          </button>
        )}
        {tab === "combos" && (
          <button type="button" className="btn-primary" onClick={handleOpenAddCombo}>
            + Thêm combo
          </button>
        )}
      </PageHeader>

      <Tabs tabs={TABS} value={tab} onChange={setTab} />

      {/* TAB 1: MÓN ĂN */}
      {tab === "dishes" && (
        <>
          <div className="toolbar">
            <input
              className="field wide"
              placeholder="Tìm món ăn..."
              value={searchFood}
              onChange={(e) => setSearchFood(e.target.value)}
            />
            <select
              className="field"
              value={filterCategory}
              onChange={(e) => setFilterCategory(e.target.value)}
            >
              <option value="">Tất cả danh mục</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id.toString()}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          <DataTable
            columns={foodColumns}
            rows={filteredFoods}
            empty="Không tìm thấy món ăn phù hợp"
            actions={(f) => (
              <RowActions
                onEdit={() => handleOpenEditFood(f)}
                onDelete={() => handleDeleteFood(f)}
              />
            )}
          />
        </>
      )}

      {/* TAB 2: DANH MỤC */}
      {tab === "categories" && (
        <DataTable
          columns={categoryColumns}
          rows={categories}
          empty="Chưa có danh mục nào"
          actions={(c) => (
            <RowActions
              onEdit={() => handleOpenEditCategory(c)}
              onDelete={() => handleDeleteCategory(c)}
            />
          )}
        />
      )}

      {/* TAB 3: NHÓM TÙY CHỌN */}
      {tab === "optionGroups" && (
        <DataTable
          columns={groupColumns}
          rows={optionGroups}
          empty="Chưa có nhóm tùy chọn nào (Ví dụ: Size, Độ cay, Thêm Topping)"
          actions={(g) => (
            <RowActions
              onEdit={() => handleOpenEditGroup(g)}
              onDelete={() => handleDeleteGroup(g)}
            />
          )}
        />
      )}

      {/* TAB 5: COMBOS */}
      {tab === "combos" && (
        <DataTable
          columns={comboColumns}
          rows={combos}
          empty="Chưa có combo món ăn nào"
          actions={(c) => (
            <div className="row-actions">
              <button
                type="button"
                className="link edit"
                onClick={() => handleOpenEditCombo(c)}
              >
                Sửa
              </button>
              <button
                type="button"
                className="link"
                onClick={() => handleDeleteCombo(c)}
              >
                Xóa
              </button>
            </div>
          )}
        />
      )}

      {/* MODAL MÓN ĂN */}
      <Modal
        isOpen={foodModalOpen}
        onClose={() => setFoodModalOpen(false)}
        title={editingFood ? "Sửa món ăn" : "Thêm món ăn"}
        maxWidth="760px"
        footer={
          <>
            <button
              type="button"
              className="btn-outline"
              onClick={() => setFoodModalOpen(false)}
            >
              Hủy
            </button>
            <button type="button" className="btn-primary" disabled={uploading} onClick={handleSaveFood}>
              Lưu món
            </button>
          </>
        }
      >
        <div className="form-group">
          <label className="form-label" htmlFor="food-name">Tên món</label>
          <input id="food-name" className="field wide" placeholder="Nhập tên món" value={foodForm.name}
            onChange={e => setFoodForm({ ...foodForm, name: e.target.value })} />
        </div>
        <div className="form-group">
          <label className="form-label" htmlFor="food-category">Danh mục</label>
          <select id="food-category" className="field wide" value={foodForm.categoryId}
            onChange={e => setFoodForm({ ...foodForm, categoryId: Number(e.target.value) })}>
            <option value={0}>Chọn danh mục</option>
            {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>
        <div className="form-row">
          <div className="form-group"><label className="form-label" htmlFor="food-price">Giá (VND)</label>
            <input id="food-price" type="number" min="0" className="field wide" value={foodForm.price}
              onChange={e => setFoodForm({ ...foodForm, price: Number(e.target.value) })} /></div>
          <div className="form-group"><label className="form-label" htmlFor="food-time">Thời gian nấu (phút)</label>
            <input id="food-time" type="number" min="0" className="field wide" value={foodForm.estimatedCookingTime}
              onChange={e => setFoodForm({ ...foodForm, estimatedCookingTime: Number(e.target.value) })} /></div>
        </div>
        <div className="form-group"><label className="form-label" htmlFor="food-description">Mô tả</label>
          <textarea id="food-description" className="field wide textarea" rows={3} placeholder="Mô tả ngắn về món" value={foodForm.description}
            onChange={e => setFoodForm({ ...foodForm, description: e.target.value })} /></div>
        <div className="form-group food-image-field"><label className="form-label" htmlFor="food-image">Ảnh món ăn</label>
          <input id="food-image" type="file" accept="image/png,image/jpeg" disabled={uploading} onChange={async e => {
              const file = e.target.files?.[0]; if (!file) return;
              setUploading(true);
              try {
                const image = await uploadFoodImage(file);
                setFoodForm(current => ({...current, image}));
                addToast("info", "Ảnh đã tải lên. Bấm Lưu món để gắn ảnh vào món.");
              } catch (error) { addToast("error", error instanceof Error ? error.message : "Không tải được ảnh"); }
              finally { setUploading(false); }
            }} />
            {uploading && <p role="status">Đang tải ảnh lên...</p>}
            {foodForm.image && <img src={foodForm.image} alt="Ảnh món ăn đã chọn" style={{maxWidth:160,maxHeight:120,display:'block'}} />}
          </div>
          {editingFood
            ? <RecipeEditor key={`recipe-${editingFood.id}`} foodId={editingFood.id} onChanged={loadAll} />
            : <RecipeEditor key="recipe-new" draft={draftRecipes} onDraftChange={setDraftRecipes} />}
          {editingFood
            ? <FoodOptionsEditor key={`options-${editingFood.id}`} foodId={editingFood.id} optionGroups={optionGroups} ingredients={ingredients} onChanged={loadAll} />
            : <FoodOptionsEditor key="options-new" draft={draftOptions} onDraftChange={setDraftOptions} optionGroups={optionGroups} ingredients={ingredients} />}

      </Modal>

      {/* MODAL DANH MỤC */}
      <Modal
        isOpen={categoryModalOpen}
        onClose={() => setCategoryModalOpen(false)}
        title={editingCategory ? "Sửa danh mục" : "Thêm danh mục mới"}
        footer={
          <>
            <button
              type="button"
              className="btn-outline"
              onClick={() => setCategoryModalOpen(false)}
            >
              Hủy
            </button>
            <button
              type="button"
              className="btn-primary"
              onClick={handleSaveCategory}
            >
              Lưu danh mục
            </button>
          </>
        }
      >
        <div className="form-group">
          <label className="form-label">Tên danh mục *</label>
          <input
            type="text"
            className="field wide"
            placeholder="Ví dụ: Món hải sản, Đồ uống, Món khai vị..."
            value={categoryForm.name}
            onChange={(e) =>
              setCategoryForm({ ...categoryForm, name: e.target.value })
            }
          />
        </div>

        <div className="form-group">
          <label className="form-label">Khu bếp phụ trách chế biến</label>
          <select
            className="field wide"
            value={categoryForm.stationId}
            onChange={(e) =>
              setCategoryForm({
                ...categoryForm,
                stationId: Number(e.target.value),
              })
            }
          >
            <option value={0}>-- Không gán khu bếp cố định --</option>
            {stations.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
          <p className="form-hint">
            * Món thuộc danh mục này khi gửi xuống bếp sẽ được định tuyến về khu bếp tương ứng.
          </p>
        </div>
      </Modal>

      {/* MODAL NHÓM TÙY CHỌN */}
      <Modal
        isOpen={groupModalOpen}
        onClose={() => setGroupModalOpen(false)}
        title={editingGroup ? "Sửa nhóm tùy chọn" : "Thêm nhóm tùy chọn mới"}
        footer={
          <>
            <button
              type="button"
              className="btn-outline"
              onClick={() => setGroupModalOpen(false)}
            >
              Hủy
            </button>
            <button type="button" className="btn-primary" onClick={handleSaveGroup}>
              Lưu nhóm
            </button>
          </>
        }
      >
        <div className="form-group">
          <label className="form-label">Tên nhóm tùy chọn *</label>
          <input
            type="text"
            className="field wide"
            placeholder="Ví dụ: Kích cỡ (Size), Mức độ cay, Topping thêm..."
            value={groupForm.name}
            onChange={(e) => setGroupForm({ ...groupForm, name: e.target.value })}
          />
        </div>

        <div className="form-group">
          <label className="form-label">Quy tắc lựa chọn</label>
          <select
            className="field wide"
            value={groupForm.selectionType}
            onChange={(e) =>
              setGroupForm({
                ...groupForm,
                selectionType: e.target.value as SelectionType,
              })
            }
          >
            <option value="SINGLE_CHOICE">Chọn một</option>
            <option value="MULTI_CHOICE">Chọn nhiều</option>
          </select>
        </div>
      </Modal>

      {/* MODAL COMBO */}
      <Modal
        isOpen={comboModalOpen}
        onClose={() => setComboModalOpen(false)}
        title={editingCombo ? "Sửa Combo" : "Thêm Combo mới"}
        footer={
          <>
            <button
              type="button"
              className="btn-outline"
              onClick={() => setComboModalOpen(false)}
            >
              Hủy
            </button>
            <button type="button" className="btn-primary" onClick={handleSaveCombo}>
              Lưu Combo
            </button>
          </>
        }
      >
        <div className="form-group">
          <label className="form-label">Tên Combo món ăn *</label>
          <input
            type="text"
            className="field wide"
            placeholder="Ví dụ: Combo Hải Sản 4 Người, Combo Lẩu Nướng Siêu Tiết Kiệm..."
            value={comboForm.name}
            onChange={(e) => setComboForm({ ...comboForm, name: e.target.value })}
          />
        </div>

        <div className="form-row">
          <div className="form-group">
            <label className="form-label">Hình thức giảm giá</label>
            <select
              className="field wide"
              value={comboForm.discountType}
              onChange={(e) =>
                setComboForm({
                  ...comboForm,
                  discountType: e.target.value as DiscountType,
                })
              }
            >
              <option value="PERCENT">Giảm theo % (PERCENT)</option>
              <option value="FIXED">Giảm số tiền cố định (VNĐ)</option>
            </select>
          </div>

          <div className="form-group">
            <label className="form-label">{comboForm.discountType === "PERCENT" ? "Tỷ lệ giảm (%) *" : "Số tiền giảm (VNĐ) *"}</label>
            <input
              type="number"
              className="field wide"
              min="0"
              max={comboForm.discountType === "PERCENT" ? 100 : undefined}
              placeholder={comboForm.discountType === "PERCENT" ? "Ví dụ: 15" : "Ví dụ: 50000"}
              value={comboForm.discountValue}
              onChange={(e) =>
                setComboForm({
                  ...comboForm,
                  discountValue: Number(e.target.value),
                })
              }
            />
          </div>
        </div>
        <p>
          {comboForm.discountType === "FIXED"
            ? "Giá combo = tổng giá các món thành phần trừ số tiền giảm, tối thiểu 0 đồng. Ví dụ: tổng 90.000đ, giảm 15.000đ thì giá combo là 75.000đ."
            : "Giá combo = tổng giá các món thành phần × (1 − tỷ lệ giảm / 100), làm tròn đến đồng."}
        </p>
      </Modal>

      {/* MODAL MÓN TRONG COMBO */}
      <Modal
        isOpen={comboItemsModalOpen}
        onClose={() => setComboItemsModalOpen(false)}
        title={`Món trong "${selectedComboForItems?.name || "Combo"}"`}
        maxWidth="600px"
        footer={
          <button
            type="button"
            className="btn-primary"
            onClick={() => setComboItemsModalOpen(false)}
          >
            Đóng
          </button>
        }
      >
        <div className="combo-item-add-box mb-4">
          <div className="form-row">
            <div className="form-group" style={{ flex: 2 }}>
              <label className="form-label">Chọn món thêm vào combo</label>
              <select
                className="field wide"
                value={newComboItemFoodId}
                onChange={(e) => setNewComboItemFoodId(Number(e.target.value))}
              >
                {foods.map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.name} - {formatVND(f.price)}
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group" style={{ flex: 1 }}>
              <label className="form-label">Số lượng</label>
              <input
                type="number"
                min={1}
                className="field wide"
                value={newComboItemQuantity}
                onChange={(e) =>
                  setNewComboItemQuantity(Math.max(1, Number(e.target.value)))
                }
              />
            </div>

            <div style={{ alignSelf: "flex-end", marginBottom: "16px" }}>
              <button
                type="button"
                className="btn-primary"
                onClick={handleAddComboItem}
              >
                + Thêm
              </button>
            </div>
          </div>
        </div>

        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>Tên món con</th>
                <th>Giá gốc</th>
                <th>Số lượng</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {comboItems.length === 0 ? (
                <tr>
                  <td colSpan={4} className="empty">
                    Chưa có món nào trong Combo này
                  </td>
                </tr>
              ) : (
                comboItems.map((ci) => {
                  const fId = ci.food?.id || ci.id?.foodId || 0;
                  return (
                    <tr key={fId}>
                      <td className="strong">{ci.food?.name || `Món #${fId}`}</td>
                      <td>{ci.food?.price ? formatVND(ci.food.price) : "-"}</td>
                      <td>x{ci.quantity}</td>
                      <td>
                        <button
                          type="button"
                          className="link text-danger"
                          onClick={() => handleDeleteComboItem(fId)}
                        >
                          Xóa
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </Modal>
    </div>
  );
}
