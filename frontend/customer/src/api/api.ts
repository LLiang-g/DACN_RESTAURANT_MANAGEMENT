import type { CallStaffResult, FoodDetail, InvoiceView, Menu, OrderResult, PlaceOrderPayload, TableInfo } from "../types/types"

const API_BASE_URL = "/api/customer" // Vite proxy chuyển sang backend :8080 (xem vite.config.ts)

export class ApiError extends Error {
  readonly status: number
  readonly code?: string
  constructor(message: string, status: number, code?: string) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.code = code
  }
}

export function isDefinitiveOrderFailure(error: unknown): boolean {
  return error instanceof ApiError && [400, 404, 409].includes(error.status)
    && !!error.code && !error.code.startsWith('IDEMPOTENCY_')
}

async function request<T>(url: string, requestOptions?: RequestInit): Promise<T> {
  const response = await fetch(API_BASE_URL + url, requestOptions)
  if (!response.ok) {
    let message = "Có lỗi xảy ra, vui lòng thử lại"
    let code: string | undefined
    try {
      const body = await response.json() // { code, message } từ GlobalExceptionHandler
      if (body?.message) message = body.message
      if (typeof body?.code === "string") code = body.code
    } catch {
      /* body không phải JSON */
    }
    throw new ApiError(message, response.status, code)
  }
  return response.json() as Promise<T>
}

export const getTable = (id: number) => request<TableInfo>(`/tables/${id}`)
export const getMenu = () => request<Menu>("/menu")
export const getFood = (id: number) => request<FoodDetail>(`/foods/${id}`)

export async function placeOrder(payload: PlaceOrderPayload, idempotencyKey: string): Promise<OrderResult> {
  const controller = new AbortController()
  const timeout = window.setTimeout(() => controller.abort(), 20000)
  try {
    return await request<OrderResult>("/orders", {
      method: "POST",
      headers: { "Content-Type": "application/json", "Idempotency-Key": idempotencyKey },
      body: JSON.stringify(payload),
      signal: controller.signal,
    })
  } catch (error) {
    if (controller.signal.aborted) throw new Error('Chưa nhận được kết quả sau 20 giây. Đơn có thể đã được lưu; hãy gửi lại đơn trước để kiểm tra.')
    if (error instanceof TypeError) throw new Error('Mất kết nối khi gửi đơn. Đơn có thể đã được nhà hàng nhận; hãy gửi lại đơn trước để kiểm tra, không đặt lại bằng mã mới.')
    throw error
  } finally { window.clearTimeout(timeout) }
}

export const getInvoice = (tableId: number) => request<InvoiceView>(`/tables/${tableId}/invoice`)

export const cancelItem = (tableId: number, orderItemId: number) =>
  request<InvoiceView>(`/tables/${tableId}/order-items/${orderItemId}/cancel`, { method: "POST" })

export const cancelOrder = (tableId: number, orderId: number) =>
  request<InvoiceView>(`/tables/${tableId}/orders/${orderId}/cancel`, { method: "POST" })

export const callStaff = (tableId: number) =>
  request<CallStaffResult>(`/tables/${tableId}/call-staff`, { method: "POST" })
