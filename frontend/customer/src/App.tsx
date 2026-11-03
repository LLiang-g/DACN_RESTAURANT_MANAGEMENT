import { useEffect, useState } from "react"
import { callStaff, getMenu, getTable, placeOrder } from "./api/api"
import {
  addToCart, buildPayload, cartCount, cartTotal, changeQuantity, formatVnd, lineTotal, type CartLine,
} from "./store/cart"
import CategoryTabs from "./components/CategoryTabs"
import InvoicePage from "./components/InvoicePage"
import ScrollToTopButton from "./components/ScrollToTopButton"
import { ComboModal, FoodModal, Sheet } from "./components/Modals"
import type { Menu, MenuCombo, MenuFood, OrderResult, TableInfo } from "./types/types"
import "./App.css"

const COMBO_TAB = "combo"

function removeVietnameseTones(str: string): string {
  return str
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/đ/g, "d")
      .replace(/Đ/g, "D")
      .toLowerCase()
      .trim();
}

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
  const [searchQuery, setSearchQuery] = useState("");
  const [addedToastKey, setAddedToastKey] = useState(0) // đổi giá trị mỗi lần thêm để hiện lại thông báo

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
    ...(menu.combos.length ? [{ key: COMBO_TAB, label: "Combo" }] : []),
    ...menu.categories.map((menuCategory) => ({ key: `c${menuCategory.id}`, label: menuCategory.name })),

  ]
  const tab = activeTab || tabs[0]?.key
  const category = menu.categories.find((menuCategory) => `c${menuCategory.id}` === tab)

  const keyword = removeVietnameseTones(searchQuery)
  const isSearching = keyword.length > 0

  // Khi đang tìm kiếm: lọc trên toàn bộ combo và tất cả danh mục
  // Khi không tìm kiếm: hiển thị theo tab hiện tại
  const displayedCombos = isSearching
      ? menu.combos.filter(
          (combo) =>
              removeVietnameseTones(combo.name).includes(keyword) ||
              combo.items.some((item) => removeVietnameseTones(item.foodName).includes(keyword))
      )
      : tab === COMBO_TAB
          ? menu.combos
          : []

  const displayedFoods = isSearching
      ? menu.categories
          .flatMap((c) => c.foods)
          .filter(
              (food) =>
                  removeVietnameseTones(food.name).includes(keyword) ||
                  (food.description && removeVietnameseTones(food.description).includes(keyword))
          )
      : tab !== COMBO_TAB
          ? category?.foods ?? []
          : []

  function addLine(line: CartLine) {
    setCart((currentCart) => addToCart(currentCart, line))
    setFoodModal(null)
    setComboModal(null)
    setAddedToastKey((previousKey) => previousKey + 1)
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
        {invoiceOpen && (
            <button className="customer-back" aria-label="Quay lại thực đơn" onClick={() => { setInvoiceOpen(false); window.scrollTo(0, 0) }}>←</button>
        )}
        <button className={invoiceOpen ? "active" : ""} onClick={() => { setInvoiceOpen(true); window.scrollTo(0, 0) }}>🧾 Hóa đơn</button>
        <button onClick={onCallStaff}>🔔 Gọi nhân viên</button>
      </div>
      {staffMessage && <div className="customer-toast">{staffMessage}</div>}

      {invoiceOpen ? (
          <InvoicePage tableId={tableId} />
      ) : (
          <>
            {/* 1. THANH TÌM KIẾM MÓN ĂN */}
            <div className="customer-search" style={{ padding: "8px 12px", background: "#fff" }}>
              <div style={{ position: "relative", display: "flex", alignItems: "center" }}>
                <input
                    type="text"
                    placeholder="🔍 Tìm món ăn, combo..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    style={{
                      width: "100%",
                      padding: "10px 34px 10px 12px",
                      borderRadius: "8px",
                      border: "1px solid #ddd",
                      fontSize: "14px",
                      outline: "none",
                    }}
                />
                {searchQuery && (
                    <button
                        type="button"
                        aria-label="Xóa tìm kiếm"
                        onClick={() => setSearchQuery("")}
                        style={{
                          position: "absolute",
                          right: "8px",
                          background: "none",
                          border: "none",
                          fontSize: "16px",
                          color: "#888",
                          cursor: "pointer",
                        }}
                    >
                      ✕
                    </button>
                )}
              </div>
            </div>

            {/* 2. ẨN TAB DANH MỤC KHI ĐANG TÌM KIẾM ĐỂ ĐỠ RỐI, HOẶC GIỮ NGUYÊN */}
            {!isSearching && <CategoryTabs tabs={tabs} activeKey={tab} onSelect={setActiveTab} />}

            {/* 3. DANH SÁCH MÓN ĂN & COMBO ĐÃ LỌC */}
            <main className="customer-list">
              {isSearching && displayedCombos.length === 0 && displayedFoods.length === 0 && (
                  <div className="customer-center customer-muted" style={{ padding: "32px 16px", textAlign: "center" }}>
                    Không tìm thấy món nào phù hợp với "{searchQuery}"
                  </div>
              )}

              {displayedCombos.map((combo) => (
                  <div
                      key={`combo-${combo.id}`}
                      className={"customer-card clickable" + (combo.available ? "" : " off")}
                      onClick={() => combo.available && setComboModal(combo)}
                  >
                    <div className="customer-card-body">
                      <div className="customer-card-name">{combo.name}</div>
                      <div className="customer-muted">
                        {combo.items.map((comboItem) => `${comboItem.quantity} ${comboItem.foodName}`).join(" + ")}
                      </div>
                      {combo.remainingPortions != null && combo.available && (
                          <div className="customer-muted">Còn {combo.remainingPortions} suất</div>
                      )}
                      <div>
                        {combo.originalPrice > combo.price && (
                            <s className="customer-muted">{formatVnd(combo.originalPrice)} </s>
                        )}
                        <b>{formatVnd(combo.price)}</b>
                      </div>
                      {!combo.available && <div className="customer-soldout">Tạm hết</div>}
                    </div>
                  </div>
              ))}

              {displayedFoods.map((food) => (
                  <div
                      key={`food-${food.id}`}
                      className={"customer-card clickable" + (food.available ? "" : " off")}
                      onClick={() => food.available && setFoodModal(food)}
                  >
                    {food.image && <img src={food.image} alt={food.name} />}
                    <div className="customer-card-body">
                      <div className="customer-card-name">{food.name}</div>
                      {food.description && <div className="customer-muted">{food.description}</div>}
                      {food.remainingPortions != null && food.available && (
                          <div className="customer-muted">Còn {food.remainingPortions} suất</div>
                      )}
                      <div>
                        <b>{formatVnd(food.price)}</b>
                        {food.estimatedCookingTime != null && (
                            <span className="customer-muted"> · ~{food.estimatedCookingTime} phút</span>
                        )}
                      </div>
                      {!food.available && <div className="customer-soldout">Tạm hết</div>}
                    </div>
                  </div>
              ))}
            </main>
          </>
      )}
      {cart.length > 0 && !invoiceOpen && (
        <button className="customer-cartbar" onClick={() => setCartOpen(true)}>
          <span>🛒 {cartCount(cart)} món</span>
          <span>{formatVnd(cartTotal(cart))}</span>
        </button>
      )}

      {addedToastKey > 0 && <div key={addedToastKey} className="customer-popup-toast">✓ Thêm thành công</div>}

      {foodModal && <FoodModal food={foodModal} onAdd={addLine} onClose={() => setFoodModal(null)} />}
      {comboModal && <ComboModal combo={comboModal} onAdd={addLine} onClose={() => setComboModal(null)} />}

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
            <button className="customer-secondary" onClick={() => { setResult(null); setInvoiceOpen(true) }}>Xem hóa đơn</button>
            <button className="customer-primary" onClick={() => setResult(null)}>Gọi thêm món</button>
          </div>
        </Sheet>
      )}

      <ScrollToTopButton />
    </div>
  )
}
