import type { CallStaffResult, FoodDetail, InvoiceView, Menu, OrderResult, PlaceOrderPayload, TableInfo } from "../types/types"

const API_BASE_URL = "/api/customer" // Vite proxy chuyển sang backend :8080 (xem vite.config.ts)

async function request<T>(url: string, requestOptions?: RequestInit): Promise<T> {
  const response = await fetch(API_BASE_URL + url, requestOptions)
  if (!response.ok) {
    let message = "Có lỗi xảy ra, vui lòng thử lại"
    try {
      const body = await response.json() // { code, message } từ GlobalExceptionHandler
      if (body?.message) message = body.message
    } catch {
      /* body không phải JSON */
    }
    throw new Error(message)
  }
  return response.json() as Promise<T>
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

export const getInvoice = (tableId: number) => request<InvoiceView>(`/tables/${tableId}/invoice`)

export const cancelItem = (tableId: number, orderItemId: number) =>
  request<InvoiceView>(`/tables/${tableId}/order-items/${orderItemId}/cancel`, { method: "POST" })

export const callStaff = (tableId: number) =>
  request<CallStaffResult>(`/tables/${tableId}/call-staff`, { method: "POST" })
