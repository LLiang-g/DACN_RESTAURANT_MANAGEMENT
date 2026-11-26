import type {
  Food,
  Ingredient,
  KitchenStation,
  KitchenAccount,
  RestaurantTable,
  Category,
  StaffAccount,
} from "../types";

export const mockStations: KitchenStation[] = [
  { id: 1, name: "Bếp nóng" },
  { id: 2, name: "Bếp lạnh & món kèm" },
  { id: 3, name: "Bếp hải sản" },
  { id: 4, name: "Quầy nước" },
  { id: 5, name: "Bếp lẩu" },
];

export const mockCategories: Category[] = [
  { id: 1, name: "Món heo", kitchenStation: mockStations[0] },
  { id: 2, name: "Hải sản", kitchenStation: mockStations[2] },
  { id: 3, name: "Món bò", kitchenStation: mockStations[0] },
  { id: 4, name: "Món gà", kitchenStation: mockStations[0] },
  { id: 5, name: "Món lẩu", kitchenStation: mockStations[4] },
  { id: 6, name: "Món ăn kèm", kitchenStation: mockStations[1] },
  { id: 7, name: "Đồ uống", kitchenStation: mockStations[3] },
];

export const mockFoods: Food[] = [
  {
    id: 1,
    name: "Heo mọi nướng ống tre",
    price: 159000,
    estimatedCookingTime: 15,
    category: mockCategories[0],
    description: "Thịt heo mọi ướp gia vị nướng trong ống tre thơm lừng",
  },
  {
    id: 2,
    name: "Mực nướng muối ớt",
    price: 169000,
    estimatedCookingTime: 20,
    category: mockCategories[1],
    description: "Mực tươi nướng muối ớt cay giòn đậm vị",
  },
  {
    id: 3,
    name: "Bò lúc lắc khoai tây",
    price: 179000,
    estimatedCookingTime: 15,
    category: mockCategories[2],
    description: "Thịt bò mềm xào rau củ kèm khoai tây chiên giòn",
  },
  {
    id: 4,
    name: "Gà nướng muối ớt",
    price: 179000,
    estimatedCookingTime: 15,
    category: mockCategories[3],
    description: "Gà ta ướp muối ớt nướng vàng ươm",
  },
  {
    id: 5,
    name: "Lẩu Thái chua cay",
    price: 299000,
    estimatedCookingTime: 30,
    category: mockCategories[4],
    description: "Nồi lẩu thái đậm đà chua cay cùng tôm mực bò tươi ngon",
  },
  {
    id: 6,
    name: "Khoai tây chiên",
    price: 49000,
    estimatedCookingTime: 15,
    category: mockCategories[5],
    description: "Khoai tây chiên vàng giòn rụm",
  },
  {
    id: 7,
    name: "Coca-Cola",
    price: 22000,
    estimatedCookingTime: 5,
    category: mockCategories[6],
    description: "Nước ngọt lon mát lạnh",
  },
];

export const mockIngredients: Ingredient[] = [
  { id: 1, name: "Thịt heo", unit: "kg", stockQuantity: 34.6, minThreshold: 5 },
  { id: 2, name: "Lòng heo", unit: "kg", stockQuantity: 39, minThreshold: 2 },
  { id: 3, name: "Mực tươi", unit: "kg", stockQuantity: 17.8, minThreshold: 3 },
  { id: 4, name: "Tôm sú", unit: "kg", stockQuantity: 2.5, minThreshold: 5 }, // sắp hết
  { id: 5, name: "Thịt bò", unit: "kg", stockQuantity: 24.1, minThreshold: 4 },
  { id: 6, name: "Nước lẩu", unit: "lít", stockQuantity: 48.2, minThreshold: 10 },
  { id: 7, name: "Rau lẩu", unit: "kg", stockQuantity: 3.2, minThreshold: 5 }, // sắp hết
];

export const mockKitchenAccounts: KitchenAccount[] = [
  { id: 1, username: "bepnong01", kitchenStation: mockStations[0] },
  { id: 2, username: "bepcold01", kitchenStation: mockStations[1] },
  { id: 3, username: "bephaisan01", kitchenStation: mockStations[2] },
  { id: 4, username: "quaynuoc01", kitchenStation: mockStations[3] },
  { id: 5, username: "beplau01", kitchenStation: mockStations[4] },
];

export const mockTables: RestaurantTable[] = [
  { id: 1, floor: "Tầng 1", tableNumber: "T1-01", status: "AVAILABLE" },
  { id: 2, floor: "Tầng 1", tableNumber: "T1-02", status: "SERVING" },
  { id: 3, floor: "Tầng 1", tableNumber: "T1-03", status: "AVAILABLE" },
  { id: 4, floor: "Tầng 2", tableNumber: "T2-01", status: "AVAILABLE" },
  { id: 5, floor: "Tầng 2", tableNumber: "T2-02", status: "AVAILABLE" },
];

export const mockStaffAccounts: StaffAccount[] = [
  { id: 1, username: "ADMIN", role: "ADMIN" },
  { id: 2, username: "letan01", role: "RECEPTIONIST" },
  { id: 3, username: "letan02", role: "RECEPTIONIST" },
];

export const mockDashboardStats = {
  dishesCount: mockFoods.length,
  ingredientsCount: mockIngredients.length,
  lowStockCount: 2,
  tablesCount: mockTables.length,
  occupiedTablesCount: 1,
  stationsCount: mockStations.length,
};
