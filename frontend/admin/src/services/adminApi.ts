import { http, setStoredAuth } from "./http";
import type {
  KitchenStation,
  StationRequest,
  Category,
  CategoryRequest,
  Food,
  FoodRequest,
  Ingredient,
  IngredientRequest,
  Recipe,
  RecipeRequest,
  StockTransaction,
  StockRequest,
  OptionGroup,
  OptionGroupRequest,
  Option,
  OptionRequest,
  Combo,
  ComboRequest,
  ComboItem,
  ComboItemRequest,
  RestaurantTable,
  TableRequest,
  StaffAccount,
  StaffAccountRequest,
  KitchenAccount,
  KitchenAccountRequest,
  ActivityLog,
  AuthUser,
  DashboardStats,
} from "../types";

// Auth
export async function login(username: string, password: string): Promise<AuthUser> {
  const res = await http<AuthUser>("/admin/auth/login", {
    method: "POST",
    body: JSON.stringify({ username, password }),
  });
  if (res.role !== "ADMIN" || res.accountType !== "STAFF") {
    setStoredAuth(null);
    throw new Error("Tài khoản không có quyền quản trị viên");
  }
  setStoredAuth(res);
  return res;
}

export const getAdminSession = () =>
  http<{ username: string; role: string; accountType: string }>("/admin/auth/me");

export function logout() {
  setStoredAuth(null);
}

// Kitchen Stations
export const getKitchenStations = () => http<KitchenStation[]>("/admin/kitchen-stations");
export const getKitchenStation = (id: number) => http<KitchenStation>(`/admin/kitchen-stations/${id}`);
export const createKitchenStation = (req: StationRequest) =>
  http<KitchenStation>("/admin/kitchen-stations", { method: "POST", body: JSON.stringify(req) });
export const updateKitchenStation = (id: number, req: StationRequest) =>
  http<KitchenStation>(`/admin/kitchen-stations/${id}`, { method: "PUT", body: JSON.stringify(req) });
export const deleteKitchenStation = (id: number) =>
  http<void>(`/admin/kitchen-stations/${id}`, { method: "DELETE" });

// Categories
export const getCategories = () => http<Category[]>("/admin/categories");
export const createCategory = (req: CategoryRequest) =>
  http<Category>("/admin/categories", { method: "POST", body: JSON.stringify(req) });
export const updateCategory = (id: number, req: CategoryRequest) =>
  http<Category>(`/admin/categories/${id}`, { method: "PUT", body: JSON.stringify(req) });
export const deleteCategory = (id: number) =>
  http<void>(`/admin/categories/${id}`, { method: "DELETE" });

// Foods
export const getFoods = () => http<Food[]>("/admin/foods");
export const getFood = (id: number) => http<Food>(`/admin/foods/${id}`);
export const createFood = (req: FoodRequest) =>
  http<Food>("/admin/foods", { method: "POST", body: JSON.stringify(req) });
export const updateFood = (id: number, req: FoodRequest) =>
  http<Food>(`/admin/foods/${id}`, { method: "PUT", body: JSON.stringify(req) });
export const deleteFood = (id: number) =>
  http<void>(`/admin/foods/${id}`, { method: "DELETE" });

// Ingredients
export const getIngredients = () => http<Ingredient[]>("/admin/ingredients");
export const createIngredient = (req: IngredientRequest) =>
  http<Ingredient>("/admin/ingredients", { method: "POST", body: JSON.stringify(req) });
export const updateIngredient = (id: number, req: IngredientRequest) =>
  http<Ingredient>(`/admin/ingredients/${id}`, { method: "PUT", body: JSON.stringify(req) });
export const deleteIngredient = (id: number) =>
  http<void>(`/admin/ingredients/${id}`, { method: "DELETE" });

// Recipes (BOM)
export const getRecipesByFood = (foodId: number) =>
  http<Recipe[]>(`/admin/foods/${foodId}/recipes`);
export const createRecipe = (req: RecipeRequest) =>
  http<Recipe>("/admin/recipes", { method: "POST", body: JSON.stringify(req) });
export const updateRecipe = (id: number, req: RecipeRequest) =>
  http<Recipe>(`/admin/recipes/${id}`, { method: "PUT", body: JSON.stringify(req) });
export const deleteRecipe = (id: number) =>
  http<void>(`/admin/recipes/${id}`, { method: "DELETE" });

// Stock Transactions
export const getStockTransactions = () =>
  http<StockTransaction[]>("/admin/stock-transactions");
export const createStockTransaction = (req: StockRequest) =>
  http<StockTransaction>("/admin/stock-transactions", { method: "POST", body: JSON.stringify(req) });

// Option Groups
export const getOptionGroups = () => http<OptionGroup[]>("/admin/option-groups");
export const createOptionGroup = (req: OptionGroupRequest) =>
  http<OptionGroup>("/admin/option-groups", { method: "POST", body: JSON.stringify(req) });
export const updateOptionGroup = (id: number, req: OptionGroupRequest) =>
  http<OptionGroup>(`/admin/option-groups/${id}`, { method: "PUT", body: JSON.stringify(req) });
export const deleteOptionGroup = (id: number) =>
  http<void>(`/admin/option-groups/${id}`, { method: "DELETE" });

// Options
export const getOptions = () => http<Option[]>("/admin/options");
export const createOption = (req: OptionRequest) =>
  http<Option>("/admin/options", { method: "POST", body: JSON.stringify(req) });
export const updateOption = (id: number, req: OptionRequest) =>
  http<Option>(`/admin/options/${id}`, { method: "PUT", body: JSON.stringify(req) });
export const deleteOption = (id: number) =>
  http<void>(`/admin/options/${id}`, { method: "DELETE" });

// Combos
export const getCombos = () => http<Combo[]>("/admin/combos");
export const createCombo = (req: ComboRequest) =>
  http<Combo>("/admin/combos", { method: "POST", body: JSON.stringify(req) });
export const updateCombo = (id: number, req: ComboRequest) =>
  http<Combo>(`/admin/combos/${id}`, { method: "PUT", body: JSON.stringify(req) });
export const deleteCombo = (id: number) =>
  http<void>(`/admin/combos/${id}`, { method: "DELETE" });

// Combo Items
export const getComboItems = (comboId: number) =>
  http<ComboItem[]>(`/admin/combos/${comboId}/items`);
export const addComboItem = (comboId: number, req: ComboItemRequest) =>
  http<ComboItem>(`/admin/combos/${comboId}/items`, { method: "POST", body: JSON.stringify(req) });
export const deleteComboItem = (comboId: number, foodId: number) =>
  http<void>(`/admin/combos/${comboId}/items/${foodId}`, { method: "DELETE" });

// Tables
export const getTables = () => http<RestaurantTable[]>("/admin/tables");
export const createTable = (req: TableRequest) =>
  http<RestaurantTable>("/admin/tables", { method: "POST", body: JSON.stringify(req) });
export const updateTable = (id: number, req: TableRequest) =>
  http<RestaurantTable>(`/admin/tables/${id}`, { method: "PUT", body: JSON.stringify(req) });
export const deleteTable = (id: number) =>
  http<void>(`/admin/tables/${id}`, { method: "DELETE" });

// Staff Accounts
export const getStaffAccounts = () => http<StaffAccount[]>("/admin/staff-accounts");
export const createStaffAccount = (req: StaffAccountRequest) =>
  http<StaffAccount>("/admin/staff-accounts", { method: "POST", body: JSON.stringify(req) });
export const updateStaffAccount = (id: number, req: StaffAccountRequest) =>
  http<StaffAccount>(`/admin/staff-accounts/${id}`, { method: "PUT", body: JSON.stringify(req) });
export const deleteStaffAccount = (id: number) =>
  http<void>(`/admin/staff-accounts/${id}`, { method: "DELETE" });

// Kitchen Accounts
export const getKitchenAccounts = () => http<KitchenAccount[]>("/admin/kitchen-accounts");
export const createKitchenAccount = (req: KitchenAccountRequest) =>
  http<KitchenAccount>("/admin/kitchen-accounts", { method: "POST", body: JSON.stringify(req) });
export const updateKitchenAccount = (id: number, req: KitchenAccountRequest) =>
  http<KitchenAccount>(`/admin/kitchen-accounts/${id}`, { method: "PUT", body: JSON.stringify(req) });
export const deleteKitchenAccount = (id: number) =>
  http<void>(`/admin/kitchen-accounts/${id}`, { method: "DELETE" });

// Activity Logs
export const getActivityLogs = () => http<ActivityLog[]>("/admin/activity-logs");

// Dashboard summary stats
export async function getDashboardStats(): Promise<DashboardStats> {
  const [foods, ingredients, tables, stations] = await Promise.all([
    getFoods().catch(() => []),
    getIngredients().catch(() => []),
    getTables().catch(() => []),
    getKitchenStations().catch(() => []),
  ]);

  const lowStock = ingredients.filter((i) => i.stockQuantity <= i.minThreshold).length;
  const occupied = tables.filter((t) => t.status === "SERVING").length;

  return {
    dishesCount: foods.length,
    ingredientsCount: ingredients.length,
    lowStockCount: lowStock,
    tablesCount: tables.length,
    occupiedTablesCount: occupied,
    stationsCount: stations.length,
  };
}
