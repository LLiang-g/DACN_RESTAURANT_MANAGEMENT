import { useEffect, useState } from "react"
import { callStaff, getMenu, getTable, placeOrder } from "./api/api"
import {
  addToCart, buildPayload, cartCount, cartTotal, changeQuantity, formatVnd, lineTotal, type CartLine,
} from "./store/cart"
import CategoryTabs from "./components/CategoryTabs"
import InvoicePage from "./components/InvoicePage"
import ScrollToTopButton from "./components/ScrollToTopButton"
import TodayFoodChat from "./components/TodayFoodChat"
import { ComboModal, FoodModal, Sheet } from "./components/Modals"
import type { Menu, MenuCombo, MenuFood, OrderResult, TableInfo } from "./types/types"
import FoodImage from "./components/FoodImage"
import "./App.css"

const COMBO_TAB = "combo"

export default function App() {
  // QR của bàn trỏ tới: http://<host>:5173/?table=1
  const tableId = Number(new URLSearchParams(window.location.search).get("table"))

  const [table, setTable] = useState<TableInfo | null>(null)
  const [menu, setMenu] = useState<Menu | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState("")
  const [search, setSearch] = useState("")
  const [availableOnly, setAvailableOnly] = useState(false)
  const [reloadKey, setReloadKey] = useState(0)
  const [callingStaff, setCallingStaff] = useState(false)
  const [foodModal, setFoodModal] = useState<MenuFood | null>(null)
  const [comboModal, setComboModal] = useState<MenuCombo | null>(null)
  const [cart, setCart] = useState<CartLine[]>([])
  const [cartOpen, setCartOpen] = useState(false)
  const [sending, setSending] = useState(false)
  const [sendError, setSendError] = useState<string | null>(null)
  const [result, setResult] = useState<OrderResult | null>(null)
  const [invoiceOpen, setInvoiceOpen] = useState(false)
  const [staffMessage, setStaffMessage] = useState<string | null>(null)
  const [addedToastKey, setAddedToastKey] = useState(0) // đổi giá trị mỗi lần thêm để hiện lại thông báo

  useEffect(() => {
    if (!Number.isSafeInteger(tableId) || tableId <= 0) return
    setError(null)
    Promise.all([getTable(tableId), getMenu()])
      .then(([loadedTable, loadedMenu]) => {
        setTable(loadedTable)
        setMenu(loadedMenu)
      })
      .catch((loadError: Error) => setError(loadError.message))
  }, [tableId, reloadKey])

  if (!Number.isSafeInteger(tableId) || tableId <= 0) {
    return <div className="customer-center"><div className="customer-state-card"><span className="customer-state-mark">S·</span><p className="customer-eyebrow">CHÀO MỪNG BẠN</p><h1>Bữa ngon bắt đầu<br />từ chiếc bàn của bạn.</h1><p>Vui lòng quét mã QR đặt trên bàn để xem thực đơn và gọi món.</p><small>Nếu cần hỗ trợ, hãy liên hệ nhân viên nhà hàng.</small></div></div>
  }
  if (error) return <div className="customer-center"><div className="customer-state-card"><span className="customer-state-mark">S·</span><h1>Chưa thể tải thực đơn</h1><p role="alert">{error}</p><button className="customer-primary" onClick={() => setReloadKey(key => key + 1)}>Thử lại</button></div></div>
  if (!menu || !table) return <div className="customer-loading" role="status" aria-label="Đang tải thực đơn"><div className="customer-loading-head" /><div className="customer-loading-hero" /><div className="customer-loading-grid">{[1,2,3,4].map(key => <div key={key} />)}</div></div>
  const tabs = [
    ...menu.categories.map(category => ({ key: `c${category.id}`, label: category.name })),
    ...(menu.combos.length ? [{ key: COMBO_TAB, label: "Combo" }] : []),
  ]
  const tab = activeTab || tabs[0]?.key || ""
  const category = menu.categories.find(item => `c${item.id}` === tab)
  const query = search.trim().toLocaleLowerCase("vi")
  const foods = (category?.foods ?? []).filter(food => (!availableOnly || food.available)
    && `${food.name} ${food.description ?? ""}`.toLocaleLowerCase("vi").includes(query))
  const combos = menu.combos.filter(combo => (!availableOnly || combo.available)
    && `${combo.name} ${combo.items.map(item => item.foodName).join(" ")}`.toLocaleLowerCase("vi").includes(query))
  const resultCount = tab === COMBO_TAB ? combos.length : foods.length
  const heroImage = menu.categories.flatMap(item => item.foods).find(food => food.available && food.image)?.image
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
    if (callingStaff) return
    setCallingStaff(true)
    try {
      const callStaffResult = await callStaff(tableId)
      setStaffMessage(callStaffResult.alreadyPending ? "Nhân viên đã nhận yêu cầu, vui lòng chờ trong giây lát" : "Đã gọi nhân viên, vui lòng chờ trong giây lát")
    } catch (caughtError) {
      setStaffMessage((caughtError as Error).message)
    }
    setCallingStaff(false)
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
        <a className="customer-brand" href="#" onClick={event => { event.preventDefault(); setInvoiceOpen(false) }}><span className="customer-logo" aria-hidden="true">S·</span><span>SMART DINING<small>GỌI MÓN TẠI BÀN</small></span></a>
        <div className="customer-table-pill"><span aria-hidden="true">▦</span><div><strong>Bàn {table.tableNumber}</strong><small>{table.floor}</small></div></div>
      </header>
      <div className="customer-navigation">
        <nav aria-label="Điều hướng gọi món"><button className={!invoiceOpen ? "active" : ""} aria-pressed={!invoiceOpen} onClick={() => { setInvoiceOpen(false); window.scrollTo(0,0) }}>Thực đơn</button><button className={invoiceOpen ? "active" : ""} aria-pressed={invoiceOpen} onClick={() => { setInvoiceOpen(true); window.scrollTo(0,0) }}>Đơn đã gọi</button></nav>
        <button className="customer-staff-button" disabled={callingStaff} onClick={onCallStaff}><span aria-hidden="true">◉</span> {callingStaff ? "Đang gọi…" : "Gọi nhân viên"}</button>
      </div>
      {staffMessage && <div className="customer-toast" role="status">{staffMessage}</div>}
      {invoiceOpen ? <InvoicePage tableId={tableId} /> : <>
        <section className="customer-hero" aria-label="Chào mừng tại bàn"><div className="customer-hero-copy"><p className="customer-eyebrow">MỘT CHÚT THƯ THẢ, MỘT BỮA THẬT NGON</p><h1>Chọn món bạn thích.<br /><em>Để bếp lo phần còn lại.</em></h1><p>Khám phá thực đơn, chọn khẩu vị riêng và tận hưởng thời gian bên nhau.</p><a href="#customer-menu" className="customer-hero-link">Khám phá thực đơn <span aria-hidden="true">↘</span></a></div><div className="customer-hero-art"><FoodImage src={heroImage} alt="Một món trong thực đơn nhà hàng" /><span className="customer-hero-stamp">NẤU THEO ĐƠN<br /><strong>Thưởng thức<br />tại bàn</strong></span></div></section>
        <div className="customer-menu-toolbar" id="customer-menu"><div><p className="customer-eyebrow">BẠN MUỐN DÙNG GÌ HÔM NAY?</p><h2>Thực đơn tại bàn</h2></div><label className="customer-search"><span aria-hidden="true">⌕</span><input type="search" placeholder="Tìm món trong danh mục…" aria-label="Tìm món trong danh mục" value={search} onChange={event => setSearch(event.target.value)} /></label></div>
        <CategoryTabs tabs={tabs} activeKey={tab} onSelect={key => { setActiveTab(key); setSearch("") }} />
        <div className="customer-category-heading"><div><h3>{tab === COMBO_TAB ? "Cùng nhau dùng combo" : category?.name ?? "Thực đơn"}</h3><span>{resultCount} {tab === COMBO_TAB ? "combo" : "món"} để lựa chọn</span></div><label className="customer-availability"><input type="checkbox" checked={availableOnly} onChange={event => setAvailableOnly(event.target.checked)} /> Chỉ hiện còn món</label></div>
        <main className="customer-list">
          {tab === COMBO_TAB ? combos.map(combo => <button type="button" key={combo.id} className={`customer-card customer-combo-card${combo.available ? "" : " off"}`} disabled={!combo.available} onClick={() => setComboModal(combo)} aria-label={`Chọn combo ${combo.name}`}>
            <div className="customer-combo-visual"><span className="customer-combo-kicker">ĐI CÙNG NHAU, ĂN CÙNG NHAU</span><strong>{combo.name}</strong><span>{combo.items.reduce((sum,item) => sum + item.quantity,0)} phần trong combo</span><div className="customer-combo-rings" aria-hidden="true"><i /><i /><i /></div></div>
            <div className="customer-card-body"><div className="customer-card-name">{combo.name}</div><p className="customer-description">{combo.items.map(item => `${item.quantity} ${item.foodName}`).join(" · ")}</p><div className="customer-food-meta"><span>{combo.available ? combo.remainingPortions != null ? `Còn ${combo.remainingPortions} suất` : "Sẵn sàng phục vụ" : "Tạm hết"}</span>{combo.originalPrice > combo.price && <span className="customer-discount">Tiết kiệm {formatVnd(combo.originalPrice-combo.price)}</span>}</div><div className="customer-price-row"><div>{combo.originalPrice > combo.price && <s>{formatVnd(combo.originalPrice)}</s>}<b>{formatVnd(combo.price)}</b></div><span className="customer-add-icon" aria-hidden="true">{combo.available ? "+" : "—"}</span></div></div>
          </button>) : foods.map(food => <button type="button" key={food.id} className={`customer-card${food.available ? "" : " off"}`} disabled={!food.available} onClick={() => setFoodModal(food)} aria-label={`Chọn món ${food.name}`}>
            <div className="customer-food-visual"><FoodImage src={food.image} alt={food.name} />{!food.available && <span className="customer-image-badge">Tạm hết</span>}</div>
            <div className="customer-card-body"><div className="customer-card-name">{food.name}</div><p className="customer-description">{food.description || "Chọn món để xem chi tiết và tùy chọn khẩu vị."}</p><div className="customer-food-meta"><span>{food.estimatedCookingTime != null ? `~${food.estimatedCookingTime} phút` : "Chế biến theo đơn"}</span>{food.available && food.remainingPortions != null && <span>Còn {food.remainingPortions} suất</span>}</div><div className="customer-price-row"><b>{formatVnd(food.price)}</b><span className="customer-add-icon" aria-hidden="true">{food.available ? "+" : "—"}</span></div></div>
          </button>)}
        </main>
        {resultCount === 0 && <div className="customer-empty"><span aria-hidden="true">⌕</span><h3>Chưa tìm thấy món phù hợp</h3><p>Thử danh mục khác hoặc thay đổi từ khóa, bộ lọc.</p><button className="customer-secondary" onClick={() => { setSearch(""); setAvailableOnly(false) }}>Xóa bộ lọc</button></div>}
        <footer className="customer-footer"><span className="customer-logo" aria-hidden="true">S·</span><div><strong>Một bữa ngon, một khoảng thời gian vui.</strong><p>Cần hỗ trợ? Nhân viên nhà hàng luôn sẵn sàng.</p></div><span>SMART DINING</span></footer>
      </>}
      {cart.length > 0 && !invoiceOpen && <button className="customer-cartbar" onClick={() => setCartOpen(true)}><span className="customer-cart-count">{cartCount(cart)}</span><span className="customer-cartbar-label">Xem giỏ món<small>{cart.length} lựa chọn của bạn</small></span><strong>{formatVnd(cartTotal(cart))}</strong><span aria-hidden="true">→</span></button>}
      {addedToastKey > 0 && <div key={addedToastKey} className="customer-popup-toast" role="status">✓ Đã thêm vào giỏ món</div>}
      {foodModal && <FoodModal food={foodModal} onAdd={addLine} onClose={() => setFoodModal(null)} />}
      {comboModal && <ComboModal combo={comboModal} onAdd={addLine} onClose={() => setComboModal(null)} />}
      {cartOpen && <Sheet title="Giỏ món của bạn" onClose={() => setCartOpen(false)} dismissible={!sending}>
        <p className="customer-sheet-intro">Bàn {table.tableNumber} · Kiểm tra món trước khi gửi đến nhà hàng.</p>
        {cart.length === 0 && <div className="customer-empty"><h3>Giỏ món đang trống</h3><p>Quay lại thực đơn để chọn món bạn thích.</p></div>}
        {cart.map(line => <div key={line.key} className="customer-cartline"><div className="customer-card-body"><div className="customer-card-name">{line.name}</div><p className="customer-muted">{line.kind === "food" ? line.optionNames.join(", ") : line.selections.filter(selection => selection.optionNames.length).map(selection => `${selection.foodName}: ${selection.optionNames.join(", ")}`).join("; ")}</p><b>{formatVnd(lineTotal(line))}</b></div><div className="customer-stepper"><button disabled={sending} aria-label={`Giảm ${line.name}`} onClick={() => setCart(current => changeQuantity(current,line.key,-1))}>−</button><span>{line.quantity}</span><button disabled={sending || line.quantity >= 99} aria-label={`Tăng ${line.name}`} onClick={() => setCart(current => changeQuantity(current,line.key,1))}>+</button></div></div>)}
        {sendError && <p className="customer-error" role="alert">{sendError}</p>}
        <div className="customer-sheet-foot"><div><small>Tạm tính</small><b>{formatVnd(cartTotal(cart))}</b></div><button className="customer-primary" disabled={sending || cart.length===0} onClick={submit}>{sending ? "Đang gửi…" : "Gửi đơn gọi món"}<span aria-hidden="true"> →</span></button></div>
        <p className="customer-order-note">Đơn sẽ được lễ tân xác nhận trước khi bếp chế biến.</p>
      </Sheet>}
      {result && <Sheet title="Nhà hàng đã nhận đơn" onClose={() => setResult(null)}><div className="customer-success-mark" aria-hidden="true">✓</div><h4 className="customer-success-title">Cảm ơn bạn đã gọi món!</h4><p className="customer-sheet-intro">Đơn #{result.orderId} đang chờ lễ tân xác nhận. Bạn có thể theo dõi trạng thái tại mục Đơn đã gọi.</p><div className="customer-success-total"><span>Tạm tính đơn vừa gửi</span><strong>{formatVnd(result.totalAmount)}</strong></div><div className="customer-sheet-foot"><button className="customer-secondary" onClick={() => { setResult(null); setInvoiceOpen(true); window.scrollTo(0,0) }}>Theo dõi đơn</button><button className="customer-primary" onClick={() => setResult(null)}>Gọi thêm món</button></div></Sheet>}
      <TodayFoodChat />
      <ScrollToTopButton />
    </div>
  )
}