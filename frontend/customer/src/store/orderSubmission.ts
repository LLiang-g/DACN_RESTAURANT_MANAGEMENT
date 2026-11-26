import type { PlaceOrderPayload } from '../types/types'

export interface PendingOrderSubmission {
  version: 2
  key: string
  payload: PlaceOrderPayload
}
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
export const pendingOrderStorageKey = (tableId: number) => `customer.pending-order.v2.${tableId}`

export function loadPendingOrder(tableId: number): PendingOrderSubmission | null {
  const raw = localStorage.getItem(pendingOrderStorageKey(tableId))
  if (!raw) return null
  let parsed: PendingOrderSubmission
  try { parsed = JSON.parse(raw) as PendingOrderSubmission } catch {
    throw new Error('Không đọc được lần gửi trước. Hãy kiểm tra Đơn đã gọi hoặc nhờ nhân viên trước khi gửi mới.')
  }
  if (parsed.version !== 2 || !UUID.test(parsed.key) || parsed.payload?.tableId !== tableId || !Array.isArray(parsed.payload.items) || !Array.isArray(parsed.payload.combos)) {
    throw new Error('Thông tin lần gửi trước không hợp lệ. Hãy kiểm tra đơn với nhân viên; không tự gửi lại bằng mã mới.')
  }
  return JSON.parse(JSON.stringify(parsed)) as PendingOrderSubmission
}

function newKey(): string {
  if (typeof crypto.randomUUID === 'function') return crypto.randomUUID()
  // getRandomValues also works when opening the restaurant LAN site over HTTP.
  const bytes = crypto.getRandomValues(new Uint8Array(16))
  bytes[6] = (bytes[6] & 15) | 64
  bytes[8] = (bytes[8] & 63) | 128
  const hex = Array.from(bytes, b => b.toString(16).padStart(2, '0')).join('')
  return `${hex.slice(0,8)}-${hex.slice(8,12)}-${hex.slice(12,16)}-${hex.slice(16,20)}-${hex.slice(20)}`
}

export function beginOrderSubmission(payload: PlaceOrderPayload): PendingOrderSubmission {
  if (loadPendingOrder(payload.tableId)) throw new Error('Còn lần gửi chưa rõ kết quả. Hãy gửi lại đơn trước để kiểm tra.')
  const snapshot = JSON.parse(JSON.stringify(payload)) as PlaceOrderPayload
  const attempt: PendingOrderSubmission = { version: 2, key: newKey(), payload: snapshot }
  // Persist before POST. If storage fails, no request is sent without a recoverable key.
  localStorage.setItem(pendingOrderStorageKey(payload.tableId), JSON.stringify(attempt))
  return attempt
}

export function clearOrderSubmission(attempt: PendingOrderSubmission): void {
  const latest = loadPendingOrder(attempt.payload.tableId)
  if (latest?.key === attempt.key) localStorage.removeItem(pendingOrderStorageKey(attempt.payload.tableId))
}
