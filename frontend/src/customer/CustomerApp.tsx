import { useEffect, useState } from "react"
import { getMenu, getTable, placeOrder } from "./api"
import {
  addToCart, buildPayload, cartCount, cartTotal, changeQuantity, formatVnd, lineTotal, type CartLine,
} from "./cart"
import { ComboModal, FoodModal, Sheet } from "./Modals"
import type { Menu, MenuCombo, MenuFood, OrderResult, TableInfo } from "./types"
import "./customer.css"

const COMBO_TAB = "combo"

export default function CustomerApp() {
  // QR của bàn trỏ tới: http://<host>:5173/?table=1
  const tableId = Number(new URLSearchParams(window.location.search).get("table"))

  const [table, setTable] = useState<TableInfo | null>(null)
  const [menu, setMenu] = useState<Menu | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState("")
  const [foodModal, setFoodModal] = useState<MenuFood | null>(null)
  const [comboModal, setComboModal] = useState<MenuCombo | null>(null)
  const [cart, setCart] = useState<CartLine[]>([])
  const [cartOpen, setCartOpen] = useState(false)
  const [sending, setSending] = useState(false)
  const [sendError, setSendError] = useState<string | null>(null)
  const [result, setResult] = useState<OrderResult | null>(null)

  useEffect(() => {
    if (!tableId) return
    Promise.all([getTable(tableId), getMenu()])
      .then(([t, m]) => {
        setTable(t)
        setMenu(m)
      })
      .catch((e: Error) => setError(e.message))
  }, [tableId])

  if (!tableId) {
    return <div className="cu-center">Vui lòng quét mã QR trên bàn để gọi món.</div>
  }
  if (error) return <div className="cu-center cu-error">{error}</div>
  if (!menu || !table) return <div className="cu-center">Đang tải thực đơn...</div>

  const tabs = [
    ...menu.categories.map((c) => ({ key: `c${c.id}`, label: c.name })),
    ...(menu.combos.length ? [{ key: COMBO_TAB, label: "Combo" }] : []),
  ]
  const tab = activeTab || tabs[0]?.key
  const category = menu.categories.find((c) => `c${c.id}` === tab)

  function addLine(line: CartLine) {
    setCart((c) => addToCart(c, line))
    setFoodModal(null)
    setComboModal(null)
  }

  function refreshMenu() {
    getMenu().then(setMenu).catch(() => {})
  }

  async function submit() {
    setSending(true)
    setSendError(null)
    try {
      const res = await placeOrder(buildPayload(tableId, cart))
      setResult(res)
      setCart([])
      setCartOpen(false)
      refreshMenu()
    } catch (e) {
      setSendError((e as Error).message)
      refreshMenu() // lỗi thường do món vừa hết -> cập nhật lại trạng thái còn/hết
    } finally {
      setSending(false)
    }
  }

  return (
    <div className="cu-app">
      <header className="cu-header">
        <h1>Gọi món</h1>
        <span>Bàn {table.tableNumber} · {table.floor}</span>
      </header>

      <nav className="cu-tabs">
        {tabs.map((t) => (
          <button key={t.key} className={t.key === tab ? "active" : ""} onClick={() => setActiveTab(t.key)}>
            {t.label}
          </button>
        ))}
      </nav>

      <main className="cu-list">
        {tab === COMBO_TAB
          ? menu.combos.map((c) => (
              <div key={c.id} className={"cu-card" + (c.available ? "" : " off")}>
                <div className="cu-card-body">
                  <div className="cu-card-name">{c.name}</div>
                  <div className="cu-muted">{c.items.map((i) => `${i.quantity} ${i.foodName}`).join(" + ")}</div>
                  <div>
                    {c.originalPrice > c.price && <s className="cu-muted">{formatVnd(c.originalPrice)} </s>}
                    <b>{formatVnd(c.price)}</b>
                  </div>
                </div>
                <button disabled={!c.available} onClick={() => setComboModal(c)}>
                  {c.available ? "Chọn" : "Tạm hết"}
                </button>
              </div>
            ))
          : category?.foods.map((f) => (
              <div key={f.id} className={"cu-card" + (f.available ? "" : " off")}>
                {f.image && <img src={f.image} alt={f.name} />}
                <div className="cu-card-body">
                  <div className="cu-card-name">{f.name}</div>
                  {f.description && <div className="cu-muted">{f.description}</div>}
                  <div>
                    <b>{formatVnd(f.price)}</b>
                    {f.estimatedCookingTime != null && <span className="cu-muted"> · ~{f.estimatedCookingTime} phút</span>}
                  </div>
                </div>
                <button
                  disabled={!f.available}
                  onClick={() =>
                    f.hasOptions
                      ? setFoodModal(f)
                      : addLine({
                          kind: "food", key: `f${f.id}:`, foodId: f.id, name: f.name,
                          quantity: 1, unitPrice: f.price, optionIds: [], optionNames: [],
                        })
                  }
                >
                  {f.available ? (f.hasOptions ? "Chọn" : "Thêm") : "Tạm hết"}
                </button>
              </div>
            ))}
      </main>

      {cart.length > 0 && (
        <button className="cu-cartbar" onClick={() => setCartOpen(true)}>
          <span>🛒 {cartCount(cart)} món</span>
          <span>{formatVnd(cartTotal(cart))}</span>
        </button>
      )}

      {foodModal && <FoodModal food={foodModal} onAdd={addLine} onClose={() => setFoodModal(null)} />}
      {comboModal && <ComboModal combo={comboModal} onAdd={addLine} onClose={() => setComboModal(null)} />}

      {cartOpen && (
        <Sheet title="Đơn của bạn" onClose={() => setCartOpen(false)}>
          {cart.map((l) => (
            <div key={l.key} className="cu-cartline">
              <div className="cu-card-body">
                <div className="cu-card-name">{l.name}</div>
                <div className="cu-muted">
                  {l.kind === "food"
                    ? l.optionNames.join(", ")
                    : l.selections.filter((s) => s.optionNames.length).map((s) => `${s.foodName}: ${s.optionNames.join(", ")}`).join("; ")}
                </div>
                <div>{formatVnd(lineTotal(l))}</div>
              </div>
              <div className="cu-stepper">
                <button onClick={() => setCart((c) => changeQuantity(c, l.key, -1))}>−</button>
                <span>{l.quantity}</span>
                <button onClick={() => setCart((c) => changeQuantity(c, l.key, 1))}>+</button>
              </div>
            </div>
          ))}
          {sendError && <p className="cu-error">{sendError}</p>}
          <div className="cu-sheet-foot">
            <b>Tổng: {formatVnd(cartTotal(cart))}</b>
            <button className="cu-primary" disabled={sending || cart.length === 0} onClick={submit}>
              {sending ? "Đang gửi..." : "Gửi đơn"}
            </button>
          </div>
        </Sheet>
      )}

      {result && (
        <Sheet title="Đã gửi đơn ✓" onClose={() => setResult(null)}>
          <p>Đơn #{result.orderId} đang chờ lễ tân xác nhận.</p>
          <p className="cu-muted">Tạm tính: {formatVnd(result.totalAmount)}</p>
          <div className="cu-sheet-foot">
            <button className="cu-primary" onClick={() => setResult(null)}>Gọi thêm món</button>
          </div>
        </Sheet>
      )}
    </div>
  )
}
