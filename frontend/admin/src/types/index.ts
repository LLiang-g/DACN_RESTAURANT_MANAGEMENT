// Common types for Restaurant Management Admin Frontend

export type StaffRole = "ADMIN" | "RECEPTIONIST";
export type TableStatus = "AVAILABLE" | "SERVING";
export type StockTransactionType = "IMPORT" | "EXPORT" | "ADJUST";
export type SelectionType = "SINGLE_CHOICE" | "MULTI_CHOICE";
export type AdjustType = "ADD" | "REMOVE";
export type DiscountType = "PERCENT" | "FIXED";
export type AccountType = "STAFF" | "KITCHEN";

export interface TabItem {
  key: string;
  label: string;
}

export interface KitchenStation {
  id: number;
  name: string;
}

export interface Category {
  id: number;
  name: string;
  kitchenStation?: KitchenStation | null;
}

export interface Food {
  id: number;
  name: string;
  price: number;
  image?: string | null;
  description?: string | null;
  estimatedCookingTime?: number | null;
  category?: Category | null;
}

export interface Ingredient {
  id: number;
  name: string;
  unit: string;
  stockQuantity: number;
  minThreshold: number;
}

export interface Recipe {
  id: number;
  food?: Food | null;
  ingredient?: Ingredient | null;
  quantityRequired: number;
}

export interface StockTransaction {
  id: number;
  ingredient?: Ingredient | null;
  type: StockTransactionType;
  quantity: number;
  note?: string | null;
  createdAt?: string | null;
}

export interface OptionGroup {
  id: number;
  name: string;
  selectionType: SelectionType;
}

export interface Option {
  id: number;
  name: string;
  food?: Food | null;
  optionGroup?: OptionGroup | null;
  ingredient?: Ingredient | null;
  adjustAmount?: number | null;
  adjustType?: AdjustType | null;
  priceDelta?: number | null;
  scaleFactor?: number | null;
}

export interface Combo {
  id: number;
  name: string;
  discountType: DiscountType;
  discountValue: number;
}

export interface ComboItem {
  id?: {
    comboId: number;
    foodId: number;
  };
  combo?: Combo | null;
  food?: Food | null;
  quantity: number;
}

export interface RestaurantTable {
  id: number;
  floor: string;
  tableNumber: string;
  status: TableStatus;
}

export interface StaffAccount {
  id: number;
  username: string;
  role: StaffRole;
}

export interface KitchenAccount {
  id: number;
  username: string;
  stationId?: number | null;
  kitchenStation?: KitchenStation | null;
}

export interface ActivityLog {
  id: number;
  accountId: number;
  accountType: AccountType;
  action: string;
  targetType: string;
  targetId?: number | null;
  detail?: string | null;
  createdAt: string;
}

export interface AuthUser {
  token: string;
  accountType: string;
  role: string;
  username: string;
  stationId?: number | null;
  stationName?: string | null;
}

// Request DTOs
export interface StationRequest {
  name: string;
}

export interface CategoryRequest {
  name: string;
  stationId?: number | null;
}

export interface FoodRequest {
  categoryId: number;
  name: string;
  price: number;
  image?: string;
  description?: string;
  estimatedCookingTime?: number;
}

export interface IngredientRequest {
  name: string;
  unit: string;
  stockQuantity: number;
  minThreshold: number;
}

export interface RecipeRequest {
  foodId: number;
  ingredientId: number;
  quantityRequired: number;
}

export interface StockRequest {
  ingredientId: number;
  type: StockTransactionType;
  quantity: number;
  note?: string;
}

export interface OptionGroupRequest {
  name: string;
  selectionType: SelectionType;
}

export interface OptionRequest {
  foodId: number;
  name: string;
  groupId: number;
  ingredientId?: number | null;
  adjustAmount?: number | null;
  adjustType?: AdjustType | null;
  priceDelta?: number | null;
  scaleFactor?: number | null;
}

export interface ComboRequest {
  name: string;
  discountType: DiscountType;
  discountValue: number;
}

export interface ComboItemRequest {
  foodId: number;
  quantity: number;
}

export interface TableRequest {
  floor: string;
  tableNumber: string;
  status: TableStatus;
}

export interface StaffAccountRequest {
  username: string;
  password?: string;
  role: StaffRole;
}

export interface KitchenAccountRequest {
  username: string;
  password?: string;
  stationId: number;
}

// Dashboard statistics interface
export interface DashboardStats {
  dishesCount: number;
  ingredientsCount: number;
  lowStockCount: number;
  tablesCount: number;
  occupiedTablesCount: number;
  stationsCount: number;
}
