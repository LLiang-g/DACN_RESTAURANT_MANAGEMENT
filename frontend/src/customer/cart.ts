import type { PlaceOrderPayload } from "./types"

export interface CartSelection {
  foodId: number
  foodName: string
  optionIds: number[]
  optionNames: string[]
}

interface BaseLine {
  key: string
  name: string
  quantity: number
  unitPrice: number // đã gồm phụ thu option
}
export interface FoodLine extends BaseLine {
  kind: "food"
  foodId: number
  optionIds: number[]
  optionNames: string[]
}
export interface ComboLine extends BaseLine {
  kind: "combo"
  comboId: number
  selections: CartSelection[]
}
export type CartLine = FoodLine | ComboLine

export const formatVnd = (n: number) => n.toLocaleString("vi-VN") + "₫"

export const lineTotal = (l: CartLine) => l.unitPrice * l.quantity
export const cartTotal = (cart: CartLine[]) => cart.reduce((s, l) => s + lineTotal(l), 0)
export const cartCount = (cart: CartLine[]) => cart.reduce((s, l) => s + l.quantity, 0)

/** Thêm vào giỏ; cùng món + cùng option thì cộng dồn số lượng. */
export function addToCart(cart: CartLine[], line: CartLine): CartLine[] {
  const existing = cart.find((l) => l.key === line.key)
  if (!existing) return [...cart, line]
  return cart.map((l) => (l.key === line.key ? { ...l, quantity: Math.min(99, l.quantity + line.quantity) } : l))
}

export function changeQuantity(cart: CartLine[], key: string, delta: number): CartLine[] {
  return cart
    .map((l) => (l.key === key ? { ...l, quantity: Math.min(99, l.quantity + delta) } : l))
    .filter((l) => l.quantity > 0)
}

export function buildPayload(tableId: number, cart: CartLine[]): PlaceOrderPayload {
  return {
    tableId,
    items: cart
      .filter((l): l is FoodLine => l.kind === "food")
      .map((l) => ({ foodId: l.foodId, quantity: l.quantity, optionIds: l.optionIds })),
    combos: cart
      .filter((l): l is ComboLine => l.kind === "combo")
      .map((l) => ({
        comboId: l.comboId,
        quantity: l.quantity,
        items: l.selections
          .filter((s) => s.optionIds.length > 0)
          .map((s) => ({ foodId: s.foodId, optionIds: s.optionIds })),
      })),
  }
}

/** Lựa chọn option của một món (dùng cho OptionPicker). */
export interface Pick {
  optionIds: number[]
  optionNames: string[]
  extra: number // tổng phụ thu của các option đã chọn (cho 1 phần)
}

export const EMPTY_PICK: Pick = { optionIds: [], optionNames: [], extra: 0 }
