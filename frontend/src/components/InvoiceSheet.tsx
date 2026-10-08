import { useEffect, useState } from "react"
import { cancelItem, getInvoice } from "../api/api"
import { formatVnd } from "../store/cart"
import { Sheet } from "./Modals"
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

const POLL_INTERVAL_MS = 5000

/** Thời gian chế biến dự kiến còn lại của món đang nấu. */
function remainingCookingText(invoiceItem: InvoiceItem, now: number): string {
  if (!invoiceItem.startedCookingAt || !invoiceItem.estimatedCookingMinutes) return ""
  const left = invoiceItem.estimatedCookingMinutes - (now - new Date(invoiceItem.startedCookingAt).getTime()) / 60000
  return left > 0 ? `Dự kiến còn ~${Math.ceil(left)} phút` : "Sắp xong, bếp đang hoàn thiện"
}

/** Hóa đơn đang mở của bàn: trạng thái từng món, tổng tạm tính, hủy món khi bếp chưa nấu. */
export default function InvoiceSheet({ tableId, onClose }: { tableId: number; onClose: () => void }) {
  const [invoice, setInvoice] = useState<InvoiceView | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [busyId, setBusyId] = useState<number | null>(null)
  const [now, setNow] = useState(() => Date.now()) // cập nhật theo mỗi lần tải để tính thời gian còn lại

  // Chưa có WebSocket cho khách nên tải lại định kỳ để thấy trạng thái mới
  useEffect(() => {
    let alive = true
    const load = () =>
      getInvoice(tableId)
        .then((loadedInvoice) => {
          if (!alive) return
          setInvoice(loadedInvoice)
          setNow(Date.now())
        })
        .catch((loadError: Error) => alive && setError(loadError.message))
    load()
    const timer = setInterval(load, POLL_INTERVAL_MS)
    return () => {
      alive = false
      clearInterval(timer)
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

  return (
    <Sheet title="Hóa đơn của bàn" onClose={onClose}>
      {error && <p className="customer-error">{error}</p>}
      {!invoice && !error && <p className="customer-muted">Đang tải...</p>}
      {invoice && invoice.orders.length === 0 && <p className="customer-muted">Bạn chưa gọi món nào.</p>}

      {invoice?.orders.map((invoiceOrder) => (
        <div key={invoiceOrder.orderId} className="customer-order">
          <div className="customer-muted">
            Đơn #{invoiceOrder.orderId} · {new Date(invoiceOrder.createdAt).toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" })}
          </div>
          {invoiceOrder.items.map((invoiceItem) => (
            <div key={invoiceItem.id} className={"customer-cartline" + (invoiceItem.status === "REJECTED" || invoiceItem.status === "RETURNED" ? " off" : "")}>
              <div className="customer-card-body">
                <div className="customer-card-name">{invoiceItem.quantity} × {invoiceItem.foodName}{invoiceItem.comboOrderId ? " (combo)" : ""}</div>
                {invoiceItem.optionNames.length > 0 && <div className="customer-muted">{invoiceItem.optionNames.join(", ")}</div>}
                <span className={"customer-badge " + invoiceItem.status}>{invoiceItem.cancelledByCustomer ? "Đã hủy" : STATUS_LABEL[invoiceItem.status]}</span>
                {invoiceItem.status === "COOKING" && <div className="customer-muted">{remainingCookingText(invoiceItem, now)}</div>}
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
        <div className="customer-sheet-foot">
          <b>Tạm tính: {formatVnd(invoice.totalAmount)}</b>
          <span className="customer-muted">Thanh toán tại quầy</span>
        </div>
      )}
    </Sheet>
  )
}
