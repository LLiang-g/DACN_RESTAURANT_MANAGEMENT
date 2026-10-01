import type { FoodDetail, Menu, OrderResult, PlaceOrderPayload, TableInfo } from "./types"

const BASE = "/api/customer" // Vite proxy chuyển sang backend :8080 (xem vite.config.ts)

async function request<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(BASE + url, init)
  if (!res.ok) {
    let message = "Có lỗi xảy ra, vui lòng thử lại"
    try {
      const body = await res.json() // { code, message } từ GlobalExceptionHandler
      if (body?.message) message = body.message
    } catch {
      /* body không phải JSON */
    }
    throw new Error(message)
  }
  return res.json() as Promise<T>
}

export const getTable = (id: number) => request<TableInfo>(`/tables/${id}`)
export const getMenu = () => request<Menu>("/menu")
export const getFood = (id: number) => request<FoodDetail>(`/foods/${id}`)

export const placeOrder = (payload: PlaceOrderPayload) =>
  request<OrderResult>("/orders", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  })
