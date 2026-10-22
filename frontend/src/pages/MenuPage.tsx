import { useEffect, useMemo, useState } from "react";
import PageHeader from "../components/ui/PageHeader";
import Tabs from "../components/ui/Tabs";
import DataTable, { type Column } from "../components/ui/DataTable";
import RowActions from "../components/ui/RowActions";
import Modal from "../components/ui/Modal";
import Toast, { type ToastMessage } from "../components/ui/Toast";
import {
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
  updateOption,
  deleteOption,
  getCombos,
  createCombo,
  updateCombo,
  deleteCombo,
  getComboItems,
  addComboItem,
  deleteComboItem,
  getIngredients,
} from "../services/adminApi";
import {
  mockFoods,
  mockCategories,
  mockStations,
  mockIngredients,
} from "../data/mock";
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
  AdjustType,
} from "../types";

const TABS: TabItem[] = [
  { key: "dishes", label: "Món ăn" },
  { key: "categories", label: "Danh mục" },
  { key: "optionGroups", label: "Nhóm option" },
  { key: "options", label: "Option" },
  { key: "combos", label: "Combo" },
];

export default function MenuPage() {
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

  const [optionModalOpen, setOptionModalOpen] = useState(false);
  const [editingOption, setEditingOption] = useState<Option | null>(null);
  const [optionForm, setOptionForm] = useState<{
    foodId: number;
    name: string;
    groupId: number;
    ingredientId: number;
    adjustAmount: number;
    adjustType: AdjustType;
    priceDelta: number;
    scaleFactor: number;
  }>({
    foodId: 0,
    name: "",
    groupId: 0,
    ingredientId: 0,
    adjustAmount: 0,
    adjustType: "ADD",
    priceDelta: 0,
    scaleFactor: 1,
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
        getFoods().catch(() => mockFoods),
        getCategories().catch(() => mockCategories),
        getKitchenStations().catch(() => mockStations),
        getOptionGroups().catch(() => []),
        getOptions().catch(() => []),
        getCombos().catch(() => []),
        getIngredients().catch(() => mockIngredients),
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
    } catch {
      setFoods(mockFoods);
      setCategories(mockCategories);
      setStations(mockStations);
      setIngredients(mockIngredients);
    }
  };

  useEffect(() => {
    let active = true;
    Promise.all([getFoods().catch(() => mockFoods), getCategories().catch(() => mockCategories),
      getKitchenStations().catch(() => mockStations), getOptionGroups().catch(() => []),
      getOptions().catch(() => []), getCombos().catch(() => []), getIngredients().catch(() => mockIngredients)])
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
        await createFood(foodForm);
        addToast("success", `Đã thêm món "${foodForm.name}" thành công`);
      }
      setFoodModalOpen(false);
      loadAll();
    } catch {
      // Fallback local update
      if (editingFood) {
        setFoods((prev) =>
          prev.map((x) =>
            x.id === editingFood.id
              ? {
                  ...x,
                  ...foodForm,
                  category: categories.find((c) => c.id === foodForm.categoryId) || x.category,
                }
              : x
          )
        );
        addToast("success", `Cập nhật món thành công (local)`);
      } else {
        const newF: Food = {
          id: Date.now(),
          ...foodForm,
          category: categories.find((c) => c.id === foodForm.categoryId),
        };
        setFoods((prev) => [...prev, newF]);
        addToast("success", `Thêm món mới thành công (local)`);
      }
      setFoodModalOpen(false);
    }
  };

  const handleDeleteFood = async (food: Food) => {
    if (!window.confirm(`Xóa món "${food.name}" khỏi thực đơn?`)) return;
    try {
      await deleteFood(food.id);
      addToast("success", `Đã xóa món "${food.name}"`);
      loadAll();
    } catch {
      setFoods((prev) => prev.filter((x) => x.id !== food.id));
      addToast("info", `Đã xóa món "${food.name}" (local)`);
    }
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
    } catch {
      if (editingCategory) {
        setCategories((prev) =>
          prev.map((c) =>
            c.id === editingCategory.id
              ? {
                  ...c,
                  name: categoryForm.name,
                  kitchenStation: stations.find((s) => s.id === categoryForm.stationId),
                }
              : c
          )
        );
      } else {
        setCategories((prev) => [
          ...prev,
          {
            id: Date.now(),
            name: categoryForm.name,
            kitchenStation: stations.find((s) => s.id === categoryForm.stationId),
          },
        ]);
      }
      setCategoryModalOpen(false);
      addToast("success", "Lưu danh mục thành công (local)");
    }
  };

  const handleDeleteCategory = async (cat: Category) => {
    if (!window.confirm(`Xóa danh mục "${cat.name}"?`)) return;
    try {
      await deleteCategory(cat.id);
      addToast("success", `Đã xóa danh mục "${cat.name}"`);
      loadAll();
    } catch {
      setCategories((prev) => prev.filter((c) => c.id !== cat.id));
      addToast("info", `Đã xóa danh mục "${cat.name}" (local)`);
    }
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
    } catch {
      if (editingGroup) {
        setOptionGroups((prev) =>
          prev.map((g) => (g.id === editingGroup.id ? { ...g, ...groupForm } : g))
        );
      } else {
        setOptionGroups((prev) => [...prev, { id: Date.now(), ...groupForm }]);
      }
      setGroupModalOpen(false);
      addToast("success", "Lưu nhóm tùy chọn thành công (local)");
    }
  };

  const handleDeleteGroup = async (g: OptionGroup) => {
    if (!window.confirm(`Xóa nhóm tùy chọn "${g.name}"?`)) return;
    try {
      await deleteOptionGroup(g.id);
      loadAll();
    } catch {
      setOptionGroups((prev) => prev.filter((x) => x.id !== g.id));
    }
  };

  // Option Handlers
  const handleOpenAddOption = () => {
    setEditingOption(null);
    setOptionForm({
      foodId: foods[0]?.id || 0,
      name: "",
      groupId: optionGroups[0]?.id || 0,
      ingredientId: 0,
      adjustAmount: 0,
      adjustType: "ADD",
      priceDelta: 0,
      scaleFactor: 1,
    });
    setOptionModalOpen(true);
  };

  const handleOpenEditOption = (opt: Option) => {
    setEditingOption(opt);
    setOptionForm({
      foodId: opt.food?.id || 0,
      name: opt.name,
      groupId: opt.optionGroup?.id || 0,
      ingredientId: opt.ingredient?.id || 0,
      adjustAmount: opt.adjustAmount || 0,
      adjustType: opt.adjustType || "ADD",
      priceDelta: opt.priceDelta || 0,
      scaleFactor: opt.scaleFactor || 1,
    });
    setOptionModalOpen(true);
  };

  const handleSaveOption = async () => {
    if (!optionForm.name.trim()) {
      addToast("error", "Tên tùy chọn không được để trống");
      return;
    }
    try {
      const payload = {
        foodId: optionForm.foodId,
        name: optionForm.name,
        groupId: optionForm.groupId,
        ingredientId: optionForm.ingredientId > 0 ? optionForm.ingredientId : null,
        adjustAmount: optionForm.adjustAmount > 0 ? optionForm.adjustAmount : null,
        adjustType: optionForm.adjustAmount > 0 ? optionForm.adjustType : null,
        priceDelta: optionForm.priceDelta,
        scaleFactor: optionForm.scaleFactor,
      };
      if (editingOption) {
        await updateOption(editingOption.id, payload);
      } else {
        await createOption(payload);
      }
      setOptionModalOpen(false);
      loadAll();
      addToast("success", "Lưu tùy chọn thành công");
    } catch {
      const targetFood = foods.find((f) => f.id === optionForm.foodId);
      const targetGroup = optionGroups.find((g) => g.id === optionForm.groupId);
      const targetIng = ingredients.find((i) => i.id === optionForm.ingredientId);
      if (editingOption) {
        setOptions((prev) =>
          prev.map((o) =>
            o.id === editingOption.id
              ? {
                  ...o,
                  name: optionForm.name,
                  food: targetFood,
                  optionGroup: targetGroup,
                  ingredient: targetIng,
                  priceDelta: optionForm.priceDelta,
                  scaleFactor: optionForm.scaleFactor,
                  adjustAmount: optionForm.adjustAmount,
                  adjustType: optionForm.adjustType,
                }
              : o
          )
        );
      } else {
        setOptions((prev) => [
          ...prev,
          {
            id: Date.now(),
            name: optionForm.name,
            food: targetFood,
            optionGroup: targetGroup,
            ingredient: targetIng,
            priceDelta: optionForm.priceDelta,
            scaleFactor: optionForm.scaleFactor,
            adjustAmount: optionForm.adjustAmount,
            adjustType: optionForm.adjustType,
          },
        ]);
      }
      setOptionModalOpen(false);
      addToast("success", "Lưu tùy chọn thành công (local)");
    }
  };

  const handleDeleteOption = async (opt: Option) => {
    if (!window.confirm(`Xóa tùy chọn "${opt.name}"?`)) return;
    try {
      await deleteOption(opt.id);
      loadAll();
    } catch {
      setOptions((prev) => prev.filter((x) => x.id !== opt.id));
    }
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
    } catch {
      if (editingCombo) {
        setCombos((prev) =>
          prev.map((c) => (c.id === editingCombo.id ? { ...c, ...comboForm } : c))
        );
      } else {
        setCombos((prev) => [...prev, { id: Date.now(), ...comboForm }]);
      }
      setComboModalOpen(false);
      addToast("success", "Lưu Combo thành công (local)");
    }
  };

  const handleDeleteCombo = async (c: Combo) => {
    if (!window.confirm(`Xóa Combo "${c.name}"?`)) return;
    try {
      await deleteCombo(c.id);
      loadAll();
    } catch {
      setCombos((prev) => prev.filter((x) => x.id !== c.id));
    }
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
    } catch {
      setComboItems([]);
    }
  };

  const handleAddComboItem = async () => {
    if (!selectedComboForItems || newComboItemFoodId === 0) return;
    try {
      await addComboItem(selectedComboForItems.id, {
        foodId: newComboItemFoodId,
        quantity: newComboItemQuantity,
      });
      const items = await getComboItems(selectedComboForItems.id);
      setComboItems(items);
      addToast("success", "Đã thêm món vào combo");
    } catch {
      const foodObj = foods.find((f) => f.id === newComboItemFoodId);
      setComboItems((prev) => [
        ...prev,
        {
          id: { comboId: selectedComboForItems.id, foodId: newComboItemFoodId },
          combo: selectedComboForItems,
          food: foodObj,
          quantity: newComboItemQuantity,
        },
      ]);
      addToast("info", "Đã thêm món vào combo (local)");
    }
  };

  const handleDeleteComboItem = async (foodId: number) => {
    if (!selectedComboForItems) return;
    try {
      await deleteComboItem(selectedComboForItems.id, foodId);
      const items = await getComboItems(selectedComboForItems.id);
      setComboItems(items);
      addToast("success", "Đã xóa món khỏi combo");
    } catch {
      setComboItems((prev) =>
        prev.filter((i) => i.food?.id !== foodId && i.id?.foodId !== foodId)
      );
      addToast("info", "Đã xóa món khỏi combo (local)");
    }
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
  const optionColumns: Column<Option>[] = [
    { key: "name", header: "Tên", className: "strong" },
    { key: "food", header: "Món ăn", render: o => o.food?.name || "—" },
    { key: "optionGroup", header: "Nhóm", render: o => o.optionGroup?.name || "—" },
    { key: "priceDelta", header: "Giá thêm", render: o => o.priceDelta ? `${o.priceDelta > 0 ? "+" : ""}${formatVND(o.priceDelta)}` : "—" },
  ];
  const comboColumns: Column<Combo>[] = [
    { key: "name", header: "Tên combo", className: "strong" },
    { key: "discount", header: "Giảm giá", render: c => c.discountType === "PERCENT" ? `${c.discountValue}%` : formatVND(c.discountValue) },
    { key: "count", header: "Số món", render: c => <button className="combo-count" onClick={() => handleOpenComboItems(c)} title="Xem và quản lý món trong combo">{comboCounts[c.id] ?? "—"}</button> },
  ];

  return (
    <div className="menu-page">
      <Toast toasts={toasts} onDismiss={(id) => setToasts((prev) => prev.filter((t) => t.id !== id))} />

      <PageHeader
        title={{ dishes: "Món ăn", categories: "Danh mục món", optionGroups: "Nhóm option", options: "Option", combos: "Combo" }[tab] ?? "Thực đơn"}
        subtitle={{ dishes: `${foods.length} món trong thực đơn`, categories: `${categories.length} danh mục`, optionGroups: `${optionGroups.length} nhóm`, options: `${options.length} option`, combos: `${combos.length} combo` }[tab]}
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
        {tab === "options" && (
          <button type="button" className="btn-primary" onClick={handleOpenAddOption}>
            + Thêm option
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

      {/* TAB 4: TÙY CHỌN */}
      {tab === "options" && (
        <DataTable
          columns={optionColumns}
          rows={options}
          empty="Chưa có tùy chọn nào. Bấm '+ Thêm option' để tạo mới."
          actions={(o) => (
            <RowActions
              onEdit={() => handleOpenEditOption(o)}
              onDelete={() => handleDeleteOption(o)}
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
        maxWidth="560px"
        footer={
          <>
            <button
              type="button"
              className="btn-outline"
              onClick={() => setFoodModalOpen(false)}
            >
              Hủy
            </button>
            <button type="button" className="btn-primary" onClick={handleSaveFood}>
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
          <input id="food-image" type="url" className="field wide" placeholder="Dán đường dẫn ảnh PNG, JPG" value={foodForm.image}
            onChange={e => setFoodForm({ ...foodForm, image: e.target.value })} /></div>
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

      {/* MODAL TÙY CHỌN CHI TIẾT */}
      <Modal
        isOpen={optionModalOpen}
        onClose={() => setOptionModalOpen(false)}
        title={editingOption ? "Sửa tùy chọn món" : "Thêm tùy chọn mới"}
        maxWidth="580px"
        footer={
          <>
            <button
              type="button"
              className="btn-outline"
              onClick={() => setOptionModalOpen(false)}
            >
              Hủy
            </button>
            <button
              type="button"
              className="btn-primary"
              onClick={handleSaveOption}
            >
              Lưu tùy chọn
            </button>
          </>
        }
      >
        <div className="form-row">
          <div className="form-group">
            <label className="form-label">Tên tùy chọn *</label>
            <input
              type="text"
              className="field wide"
              placeholder="Ví dụ: Size L, Ít cay, Thêm phô mai..."
              value={optionForm.name}
              onChange={(e) =>
                setOptionForm({ ...optionForm, name: e.target.value })
              }
            />
          </div>

          <div className="form-group">
            <label className="form-label">Nhóm tùy chọn *</label>
            <select
              className="field wide"
              value={optionForm.groupId}
              onChange={(e) =>
                setOptionForm({ ...optionForm, groupId: Number(e.target.value) })
              }
            >
              <option value={0}>-- Chọn nhóm --</option>
              {optionGroups.map((g) => (
                <option key={g.id} value={g.id}>
                  {g.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="form-group">
          <label className="form-label">Áp dụng cho món ăn</label>
          <select
            className="field wide"
            value={optionForm.foodId}
            onChange={(e) =>
              setOptionForm({ ...optionForm, foodId: Number(e.target.value) })
            }
          >
            <option value={0}>-- Chọn món ăn --</option>
            {foods.map((f) => (
              <option key={f.id} value={f.id}>
                {f.name}
              </option>
            ))}
          </select>
        </div>

        <div className="form-row">
          <div className="form-group">
            <label className="form-label">Chênh lệch giá (VNĐ)</label>
            <input
              type="number"
              className="field wide"
              placeholder="+20000 hoặc 0"
              value={optionForm.priceDelta || ""}
              onChange={(e) =>
                setOptionForm({
                  ...optionForm,
                  priceDelta: Number(e.target.value),
                })
              }
            />
          </div>

          <div className="form-group">
            <label className="form-label">Hệ số định lượng (Scale factor)</label>
            <input
              type="number"
              step="0.1"
              className="field wide"
              placeholder="1.0"
              value={optionForm.scaleFactor || ""}
              onChange={(e) =>
                setOptionForm({
                  ...optionForm,
                  scaleFactor: Number(e.target.value),
                })
              }
            />
          </div>
        </div>

        <div className="form-row">
          <div className="form-group">
            <label className="form-label">Điều chỉnh nguyên liệu cụ thể</label>
            <select
              className="field wide"
              value={optionForm.ingredientId}
              onChange={(e) =>
                setOptionForm({
                  ...optionForm,
                  ingredientId: Number(e.target.value),
                })
              }
            >
              <option value={0}>-- Không điều chỉnh nguyên liệu --</option>
              {ingredients.map((i) => (
                <option key={i.id} value={i.id}>
                  {i.name} ({i.unit})
                </option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label className="form-label">Lượng điều chỉnh</label>
            <div style={{ display: "flex", gap: "8px" }}>
              <select
                className="field"
                style={{ width: "90px" }}
                value={optionForm.adjustType}
                onChange={(e) =>
                  setOptionForm({
                    ...optionForm,
                    adjustType: e.target.value as AdjustType,
                  })
                }
              >
                <option value="ADD">Cộng (+)</option>
                <option value="REMOVE">Trừ (-)</option>
              </select>
              <input
                type="number"
                step="0.1"
                className="field"
                style={{ flex: 1 }}
                placeholder="Số lượng"
                value={optionForm.adjustAmount || ""}
                onChange={(e) =>
                  setOptionForm({
                    ...optionForm,
                    adjustAmount: Number(e.target.value),
                  })
                }
              />
            </div>
          </div>
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
              <option value="FIXED">Giảm số tiền cố định (FIXED VND)</option>
            </select>
          </div>

          <div className="form-group">
            <label className="form-label">Giá trị giảm giá *</label>
            <input
              type="number"
              className="field wide"
              placeholder={comboForm.discountType === "PERCENT" ? "15 (%)" : "50000 (VND)"}
              value={comboForm.discountValue || ""}
              onChange={(e) =>
                setComboForm({
                  ...comboForm,
                  discountValue: Number(e.target.value),
                })
              }
            />
          </div>
        </div>
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
