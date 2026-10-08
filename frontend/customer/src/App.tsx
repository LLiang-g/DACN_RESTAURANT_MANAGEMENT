import { useEffect, useState } from "react"
import { callStaff, getMenu, getTable, placeOrder } from "./api/api"
import {
  addToCart, buildPayload, cartCount, cartTotal, changeQuantity, formatVnd, lineTotal, type CartLine,
} from "./store/cart"
import InvoiceSheet from "./components/InvoiceSheet"
import { ComboModal, FoodModal, Sheet } from "./components/Modals"
import type { Menu, MenuCombo, MenuFood, OrderResult, TableInfo } from "./types/types"
import "./App.css"

const COMBO_TAB = "combo"

export default function App() {
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
  const [invoiceOpen, setInvoiceOpen] = useState(false)
  const [staffMessage, setStaffMessage] = useState<string | null>(null)

  useEffect(() => {
    if (!tableId) return
    Promise.all([getTable(tableId), getMenu()])
      .then(([loadedTable, loadedMenu]) => {
        setTable(loadedTable)
        setMenu(loadedMenu)
      })
      .catch((loadError: Error) => setError(loadError.message))
  }, [tableId])

  if (!tableId) {
    return <div className="customer-center">Vui lòng quét mã QR trên bàn để gọi món.</div>
  }
  if (error) return <div className="customer-center customer-error">{error}</div>
  if (!menu || !table) return <div className="customer-center">Đang tải thực đơn...</div>

  const tabs = [
    ...menu.categories.map((menuCategory) => ({ key: `c${menuCategory.id}`, label: menuCategory.name })),
    ...(menu.combos.length ? [{ key: COMBO_TAB, label: "Combo" }] : []),
  ]
  const tab = activeTab || tabs[0]?.key
  const category = menu.categories.find((menuCategory) => `c${menuCategory.id}` === tab)

  function addLine(line: CartLine) {
    setCart((currentCart) => addToCart(currentCart, line))
    setFoodModal(null)
    setComboModal(null)
  }

  function refreshMenu() {
    getMenu().then(setMenu).catch(() => {})
  }

  async function onCallStaff() {
    try {
      const callStaffResult = await callStaff(tableId)
      setStaffMessage(callStaffResult.alreadyPending ? "Nhân viên đã nhận yêu cầu, vui lòng chờ trong giây lát" : "Đã gọi nhân viên, vui lòng chờ trong giây lát")
    } catch (caughtError) {
      setStaffMessage((caughtError as Error).message)
    }
    setTimeout(() => setStaffMessage(null), 4000)
  }

  async function submit() {
    setSending(true)
    setSendError(null)
    try {
      const placedOrder = await placeOrder(buildPayload(tableId, cart))
      setResult(placedOrder)
      setCart([])
      setCartOpen(false)
      refreshMenu()
    } catch (caughtError) {
      setSendError((caughtError as Error).message)
      refreshMenu() // lỗi thường do món vừa hết -> cập nhật lại trạng thái còn/hết
    } finally {
      setSending(false)
    }
  }

  return (
    <div className="customer-app">
      <header className="customer-header">
        <h1>Gọi món</h1>
        <span>Bàn {table.tableNumber} · {table.floor}</span>
      </header>
      <div className="customer-actions">
        <button onClick={() => setInvoiceOpen(true)}>🧾 Hóa đơn</button>
        <button onClick={onCallStaff}>🔔 Gọi nhân viên</button>
      </div>
      {staffMessage && <div className="customer-toast">{staffMessage}</div>}

      <nav className="customer-tabs">
        {tabs.map((tabItem) => (
          <button key={tabItem.key} className={tabItem.key === tab ? "active" : ""} onClick={() => setActiveTab(tabItem.key)}>
            {tabItem.label}
          </button>
        ))}
      </nav>

      <main className="customer-list">
        {tab === COMBO_TAB
          ? menu.combos.map((combo) => (
              <div key={combo.id} className={"customer-card" + (combo.available ? "" : " off")}>
                <div className="customer-card-body">
                  <div className="customer-card-name">{combo.name}</div>
                  <div className="customer-muted">{combo.items.map((comboItem) => `${comboItem.quantity} ${comboItem.foodName}`).join(" + ")}</div>
                  {combo.remainingPortions != null && combo.available && <div className="customer-muted">Còn {combo.remainingPortions} suất</div>}
                  <div>
                    {combo.originalPrice > combo.price && <s className="customer-muted">{formatVnd(combo.originalPrice)} </s>}
                    <b>{formatVnd(combo.price)}</b>
                  </div>
                </div>
                <button disabled={!combo.available} onClick={() => setComboModal(combo)}>
                  {combo.available ? "Chọn" : "Tạm hết"}
                </button>
              </div>
            ))
          : category?.foods.map((food) => (
              <div key={food.id} className={"customer-card" + (food.available ? "" : " off")}>
                {food.image && <img src={food.image} alt={food.name} />}
                <div className="customer-card-body">
                  <div className="customer-card-name">{food.name}</div>
                  {food.description && <div className="customer-muted">{food.description}</div>}
                  {food.remainingPortions != null && food.available && <div className="customer-muted">Còn {food.remainingPortions} suất</div>}
                  <div>
                    <b>{formatVnd(food.price)}</b>
                    {food.estimatedCookingTime != null && <span className="customer-muted"> · ~{food.estimatedCookingTime} phút</span>}
                  </div>
                </div>
                <button
                  disabled={!food.available}
                  onClick={() =>
                    food.hasOptions
                      ? setFoodModal(food)
                      : addLine({
                          kind: "food", key: `f${food.id}:`, foodId: food.id, name: food.name,
                          quantity: 1, unitPrice: food.price, optionIds: [], optionNames: [],
                        })
                  }
                >
                  {food.available ? (food.hasOptions ? "Chọn" : "Thêm") : "Tạm hết"}
                </button>
              </div>
            ))}
      </main>

      {cart.length > 0 && (
        <button className="customer-cartbar" onClick={() => setCartOpen(true)}>
          <span>🛒 {cartCount(cart)} món</span>
          <span>{formatVnd(cartTotal(cart))}</span>
        </button>
      )}

      {foodModal && <FoodModal food={foodModal} onAdd={addLine} onClose={() => setFoodModal(null)} />}
      {comboModal && <ComboModal combo={comboModal} onAdd={addLine} onClose={() => setComboModal(null)} />}

      {invoiceOpen && <InvoiceSheet tableId={tableId} onClose={() => setInvoiceOpen(false)} />}

      {cartOpen && (
        <Sheet title="Đơn của bạn" onClose={() => setCartOpen(false)}>
          {cart.map((cartLine) => (
            <div key={cartLine.key} className="customer-cartline">
              <div className="customer-card-body">
                <div className="customer-card-name">{cartLine.name}</div>
                <div className="customer-muted">
                  {cartLine.kind === "food"
                    ? cartLine.optionNames.join(", ")
                    : cartLine.selections.filter((selection) => selection.optionNames.length).map((selection) => `${selection.foodName}: ${selection.optionNames.join(", ")}`).join("; ")}
                </div>
                <div>{formatVnd(lineTotal(cartLine))}</div>
              </div>
              <div className="customer-stepper">
                <button onClick={() => setCart((currentCart) => changeQuantity(currentCart, cartLine.key, -1))}>−</button>
                <span>{cartLine.quantity}</span>
                <button onClick={() => setCart((currentCart) => changeQuantity(currentCart, cartLine.key, 1))}>+</button>
              </div>
            </div>
          ))}
          {sendError && <p className="customer-error">{sendError}</p>}
          <div className="customer-sheet-foot">
            <b>Tổng: {formatVnd(cartTotal(cart))}</b>
            <button className="customer-primary" disabled={sending || cart.length === 0} onClick={submit}>
              {sending ? "Đang gửi..." : "Gửi đơn"}
            </button>
          </div>
        </Sheet>
      )}

      {result && (
        <Sheet title="Đã gửi đơn ✓" onClose={() => setResult(null)}>
          <p>Đơn #{result.orderId} đang chờ lễ tân xác nhận.</p>
          <p className="customer-muted">Tạm tính: {formatVnd(result.totalAmount)}</p>
          <div className="customer-sheet-foot">
            <button onClick={() => { setResult(null); setInvoiceOpen(true) }}>Xem hóa đơn</button>
            <button className="customer-primary" onClick={() => setResult(null)}>Gọi thêm món</button>
          </div>
        </Sheet>
      )}
    </div>
  )
}
