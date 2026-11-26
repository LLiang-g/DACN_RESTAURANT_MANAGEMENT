import type { PlaceOrderPayload } from "../types/types"

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

export const formatVnd = (amount: number) => amount.toLocaleString("vi-VN") + "₫"

export const lineTotal = (cartLine: CartLine) => cartLine.unitPrice * cartLine.quantity
export const cartTotal = (cart: CartLine[]) => cart.reduce((sum, cartLine) => sum + lineTotal(cartLine), 0)
export const cartCount = (cart: CartLine[]) => cart.reduce((sum, cartLine) => sum + cartLine.quantity, 0)

/** Thêm vào giỏ; cùng món + cùng option thì cộng dồn số lượng. */
export function addToCart(cart: CartLine[], line: CartLine): CartLine[] {
  const existing = cart.find((cartLine) => cartLine.key === line.key)
  if (!existing) return [...cart, line]
  return cart.map((cartLine) => (cartLine.key === line.key ? { ...cartLine, quantity: Math.min(99, cartLine.quantity + line.quantity) } : cartLine))
}

export function changeQuantity(cart: CartLine[], key: string, delta: number): CartLine[] {
  return cart
    .map((cartLine) => (cartLine.key === key ? { ...cartLine, quantity: Math.min(99, cartLine.quantity + delta) } : cartLine))
    .filter((cartLine) => cartLine.quantity > 0)
}

export function buildPayload(tableId: number, cart: CartLine[]): PlaceOrderPayload {
  return {
    tableId,
    items: cart
      .filter((cartLine): cartLine is FoodLine => cartLine.kind === "food")
      .map((cartLine) => ({ foodId: cartLine.foodId, quantity: cartLine.quantity, optionIds: cartLine.optionIds })),
    combos: cart
      .filter((cartLine): cartLine is ComboLine => cartLine.kind === "combo")
      .map((cartLine) => ({
        comboId: cartLine.comboId,
        quantity: cartLine.quantity,
        items: cartLine.selections
          .filter((selection) => selection.optionIds.length > 0)
          .map((selection) => ({ foodId: selection.foodId, optionIds: selection.optionIds })),
      })),
  }
}

/** Lựa chọn option của một món (dùng cho OptionPicker). */
export interface SelectedOptions {
  optionIds: number[]
  optionNames: string[]
  extra: number // tổng phụ thu của các option đã chọn (cho 1 phần)
}

export const NO_SELECTED_OPTIONS: SelectedOptions = { optionIds: [], optionNames: [], extra: 0 }
