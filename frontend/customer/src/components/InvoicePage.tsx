import { useEffect, useState } from "react"
import { cancelItem, cancelOrder, getInvoice } from "../api/api"
import { connectTableSocket } from "../realtime/tableSocket"
import { formatVnd } from "../store/cart"
import type { InvoiceItem, InvoiceView, ItemStatus } from "../types/types"

const STATUS_LABEL: Record<ItemStatus, string> = {
  PENDING: "Chờ duyệt",
  CONFIRMED: "Đã duyệt, chờ bếp",
  REJECTED: "Bị từ chối",
  COOKING: "Đang nấu",
  DONE: "Đã xong",
  SERVED: "Đã phục vụ",
  RETURNED: "Đã trả lại",
}

// Cập nhật chính đến từ WebSocket; tải định kỳ chỉ là dự phòng khi mất kết nối
const POLL_INTERVAL_MS = 15000
const COUNTDOWN_TICK_MS = 30000

/** Thời gian chế biến dự kiến còn lại của món đang nấu. */
function remainingCookingText(invoiceItem: InvoiceItem, loadedAt: number, now: number): string {
  if (invoiceItem.remainingCookingSeconds == null) return ""
  // Server tính số giây còn lại tại lúc tải; trừ thêm thời gian đã trôi qua kể từ lúc đó
  const leftSeconds = invoiceItem.remainingCookingSeconds - (now - loadedAt) / 1000
  return leftSeconds > 0 ? `Dự kiến còn ~${Math.ceil(leftSeconds / 60)} phút` : "Sắp xong, bếp đang hoàn thiện"
}

/** Trang hóa đơn đang mở của bàn (thay phần thực đơn): trạng thái từng món, tổng tạm tính, hủy món khi bếp chưa nấu. */
export default function InvoicePage({ tableId }: { tableId: number }) {
  const [invoice, setInvoice] = useState<InvoiceView | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [busyId, setBusyId] = useState<number | null>(null)
  const [loadedAt, setLoadedAt] = useState(() => Date.now()) // lúc tải hóa đơn gần nhất
  const [now, setNow] = useState(() => Date.now())

  // Nhận tín hiệu realtime của bàn (/topic/table/{id}) rồi tải lại; kèm tải định kỳ dự phòng
  useEffect(() => {
    let alive = true
    const load = () =>
      getInvoice(tableId)
        .then((loadedInvoice) => {
          if (!alive) return
          setInvoice(loadedInvoice)
          setLoadedAt(Date.now())
          setNow(Date.now())
        })
        .catch((loadError: Error) => alive && setError(loadError.message))
    load()
    const timer = setInterval(load, POLL_INTERVAL_MS)
    const tick = setInterval(() => setNow(Date.now()), COUNTDOWN_TICK_MS)
    const disconnect = connectTableSocket(tableId, load)
    return () => {
      alive = false
      clearInterval(timer)
      clearInterval(tick)
      disconnect()
    }
  }, [tableId])

  async function cancel(item: InvoiceItem) {
    const confirmMessage = item.comboOrderId
      ? `Món "${item.foodName}" thuộc combo, hủy sẽ hủy cả combo này. Tiếp tục?`
      : `Hủy món "${item.foodName}"?`
    if (!window.confirm(confirmMessage)) return
    setBusyId(item.id)
    setError(null)
    try {
      setInvoice(await cancelItem(tableId, item.id))
    } catch (caughtError) {
      setError((caughtError as Error).message) // ví dụ: bếp vừa bấm Nấu
      getInvoice(tableId).then(setInvoice).catch(() => {})
    } finally {
      setBusyId(null)
    }
  }

  async function cancelWholeOrder(orderId: number) {
    if (!window.confirm(`Hủy cả đơn #${orderId}?`)) return
    setBusyId(-orderId)
    setError(null)
    try {
      setInvoice(await cancelOrder(tableId, orderId))
    } catch (caughtError) {
      setError((caughtError as Error).message) // ví dụ: bếp đã nấu một số món trong đơn
      getInvoice(tableId).then(setInvoice).catch(() => {})
    } finally {
      setBusyId(null)
    }
  }

  return (
    <section className="customer-invoice-page">
      <h2 className="customer-invoice-title">Hóa đơn của bàn</h2>
      {error && <p className="customer-error">{error}</p>}
      {!invoice && !error && <p className="customer-muted">Đang tải...</p>}
      {invoice && invoice.orders.length === 0 && <p className="customer-muted">Bạn chưa gọi món nào.</p>}

      {invoice?.orders.slice().sort((a, b) => b.orderId - a.orderId).map((invoiceOrder) => (
        <div key={invoiceOrder.orderId} className="customer-order">
          <div className="customer-order-head">
            <span>Đơn #{invoiceOrder.orderId} · {new Date(invoiceOrder.createdAt).toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" })}</span>
            {invoiceOrder.items.some((orderItem) => orderItem.cancellable) && invoiceOrder.items.every((orderItem) => orderItem.cancellable || orderItem.status === "REJECTED" || orderItem.status === "RETURNED") && (
              <button className="customer-danger" disabled={busyId === -invoiceOrder.orderId} onClick={() => cancelWholeOrder(invoiceOrder.orderId)}>Hủy cả đơn</button>
            )}
          </div>
          {invoiceOrder.items.map((invoiceItem) => (
            <div key={invoiceItem.id} className={"customer-cartline" + (invoiceItem.status === "REJECTED" || invoiceItem.status === "RETURNED" ? " off" : "")}>
              <div className="customer-card-body">
                <div className="customer-card-name">{invoiceItem.quantity} × {invoiceItem.foodName}{invoiceItem.comboOrderId ? " (combo)" : ""}</div>
                {invoiceItem.optionNames.length > 0 && <div className="customer-muted">{invoiceItem.optionNames.join(", ")}</div>}
                <span className={"customer-badge " + invoiceItem.status}>{invoiceItem.cancelledByCustomer ? "Đã hủy" : STATUS_LABEL[invoiceItem.status]}</span>
                {invoiceItem.status === "COOKING" && <div className="customer-muted">{remainingCookingText(invoiceItem, loadedAt, now)}</div>}
                {invoiceItem.status === "REJECTED" && !invoiceItem.cancelledByCustomer && invoiceItem.note && <div className="customer-error">Lý do: {invoiceItem.note}</div>}
                {invoiceItem.status === "RETURNED" && invoiceItem.note && <div className="customer-muted">Ghi chú: {invoiceItem.note}</div>}
              </div>
              <div className="customer-right">
                {!invoiceItem.comboOrderId && <div>{formatVnd(invoiceItem.unitPrice * invoiceItem.quantity)}</div>}
                {invoiceItem.cancellable && (
                  <button className="customer-danger" disabled={busyId === invoiceItem.id} onClick={() => cancel(invoiceItem)}>Hủy</button>
                )}
              </div>
            </div>
          ))}
          {invoiceOrder.combos.map((invoiceCombo) => (
            <div key={invoiceCombo.id} className={"customer-cartline" + (invoiceCombo.active ? "" : " off")}>
              <div className="customer-card-body"><div className="customer-card-name">{invoiceCombo.quantity} × {invoiceCombo.comboName}</div></div>
              <div>{formatVnd(invoiceCombo.comboPrice * invoiceCombo.quantity)}</div>
            </div>
          ))}
        </div>
      ))}

      {invoice && invoice.orders.length > 0 && (
        <div className="customer-invoice-total">
          <b>Tạm tính: {formatVnd(invoice.totalAmount)}</b>
          <span className="customer-muted">Thanh toán tại quầy</span>
        </div>
      )}
    </section>
  )
}
