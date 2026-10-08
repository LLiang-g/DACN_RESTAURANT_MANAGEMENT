// Kiểu dữ liệu khớp với DTO của backend (customer/dto)

export interface TableInfo {
  id: number
  floor: string
  tableNumber: string
}

export interface MenuFood {
  id: number
  name: string
  price: number
  image: string | null
  description: string | null
  estimatedCookingTime: number | null
  available: boolean
  remainingPortions: number | null // null = không giới hạn
  hasOptions: boolean
}

export interface MenuCategory {
  id: number
  name: string
  foods: MenuFood[]
}

export interface MenuComboItem {
  foodId: number
  foodName: string
  quantity: number
  hasOptions: boolean
}

export interface MenuCombo {
  id: number
  name: string
  price: number
  originalPrice: number
  available: boolean
  remainingPortions: number | null
  items: MenuComboItem[]
}

export interface Menu {
  categories: MenuCategory[]
  combos: MenuCombo[]
}

export interface FoodOption {
  id: number
  name: string
  priceDelta: number
}

export interface OptionGroup {
  id: number
  name: string
  selectionType: "SINGLE_CHOICE" | "MULTI_CHOICE"
  options: FoodOption[]
}

export interface FoodDetail {
  id: number
  name: string
  price: number
  available: boolean
  remainingPortions: number | null
  optionGroups: OptionGroup[]
}

export interface OrderResult {
  orderId: number
  invoiceId: number
  totalAmount: number
}

export interface PlaceOrderPayload {
  tableId: number
  items: { foodId: number; quantity: number; optionIds: number[] }[]
  combos: {
    comboId: number
    quantity: number
    items: { foodId: number; optionIds: number[] }[]
  }[]
}
