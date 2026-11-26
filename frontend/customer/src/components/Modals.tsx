import { useEffect, useId, useRef, useState, type ReactNode } from "react"
import FoodImage from "./FoodImage"
import type { MenuCombo, MenuFood } from "../types/types"
import { NO_SELECTED_OPTIONS, formatVnd, type CartLine, type SelectedOptions } from "../store/cart"
import OptionPicker from "./OptionPicker"

export function Sheet({ title, onClose, children, dismissible = true }: { title: string; onClose: () => void; children: ReactNode; dismissible?: boolean }) {
  const ref = useRef<HTMLDivElement>(null)
  const titleId = useId()
  const closeRef = useRef(onClose)
  const allowClose = useRef(dismissible)
  closeRef.current = onClose
  allowClose.current = dismissible
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null
    const overflow = document.body.style.overflow
    document.body.style.overflow = "hidden"
    const elements = () => Array.from(ref.current?.querySelectorAll<HTMLElement>('button:not(:disabled), input:not(:disabled), textarea:not(:disabled), select:not(:disabled), a[href], [tabindex="0"]') ?? []).filter(element => element.getClientRects().length > 0)
    const frame = requestAnimationFrame(() => (elements()[0] ?? ref.current)?.focus())
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") { event.preventDefault(); if (allowClose.current) closeRef.current(); return }
      if (event.key !== "Tab") return
      const focusable = elements()
      if (!focusable.length) { event.preventDefault(); ref.current?.focus(); return }
      const first = focusable[0], last = focusable[focusable.length - 1]
      if (event.shiftKey && (document.activeElement === first || document.activeElement === ref.current)) { event.preventDefault(); last.focus() }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus() }
    }
    document.addEventListener("keydown", onKeyDown)
    return () => { cancelAnimationFrame(frame); document.removeEventListener("keydown",onKeyDown); document.body.style.overflow = overflow; previous?.focus() }
  }, [])
  return <div className="customer-overlay" onClick={() => { if (dismissible) onClose() }}><div ref={ref} className="customer-sheet" role="dialog" aria-modal="true" aria-labelledby={titleId} tabIndex={-1} onClick={event => event.stopPropagation()}><div className="customer-sheet-head"><div><p className="customer-eyebrow">MỘT LỰA CHỌN THẬT NGON</p><h3 id={titleId}>{title}</h3></div><button className="customer-icon-btn" onClick={onClose} disabled={!dismissible} aria-label="Đóng">✕</button></div>{children}</div></div>
}
export function QuantityStepper({ value, onChange }: { value: number; onChange: (newValue: number) => void }) {
  return (
    <div className="customer-stepper">
      <button aria-label="Giảm số lượng" disabled={value <= 1} onClick={() => onChange(Math.max(1, value - 1))}>−</button>
      <span>{value}</span>
      <button aria-label="Tăng số lượng" disabled={value >= 99} onClick={() => onChange(Math.min(99, value + 1))}>+</button>
    </div>
  )
}

export function FoodModal({ food, onAdd, onClose }: { food: MenuFood; onAdd: (cartLine: CartLine) => void; onClose: () => void }) {
  const [quantity, setQuantity] = useState(1)
  const [selectedOptions, setSelectedOptions] = useState<SelectedOptions>(NO_SELECTED_OPTIONS)
  const unitPrice = food.price + selectedOptions.extra

  function handleAdd() {
    onAdd({
      kind: "food",
      key: `f${food.id}:${[...selectedOptions.optionIds].sort().join(",")}`,
      foodId: food.id,
      name: food.name,
      quantity,
      unitPrice,
      optionIds: selectedOptions.optionIds,
      optionNames: selectedOptions.optionNames,
    })
  }

  return (
    <Sheet title={food.name} onClose={onClose}>
      <div className="customer-modal-food-image"><FoodImage src={food.image} alt={food.name} /></div>
      {food.description && <p className="customer-muted">{food.description}</p>}
      <OptionPicker foodId={food.id} onChange={setSelectedOptions} />
      <div className="customer-sheet-foot">
        <QuantityStepper value={quantity} onChange={setQuantity} />
        <button className="customer-primary" onClick={handleAdd}>Thêm · {formatVnd(unitPrice * quantity)}</button>
      </div>
    </Sheet>
  )
}

export function ComboModal({ combo, onAdd, onClose }: { combo: MenuCombo; onAdd: (cartLine: CartLine) => void; onClose: () => void }) {
  const [quantity, setQuantity] = useState(1)
  const [selectedOptionsByFood, setSelectedOptionsByFood] = useState<Record<number, SelectedOptions>>({})

  // phụ thu cho 1 combo = Σ (phụ thu option × số lượng món đó trong combo)
  const extra = combo.items.reduce((sum, comboItem) => sum + (selectedOptionsByFood[comboItem.foodId]?.extra ?? 0) * comboItem.quantity, 0)
  const unitPrice = combo.price + extra

  function handleAdd() {
    onAdd({
      kind: "combo",
      key: `c${combo.id}:${JSON.stringify(Object.entries(selectedOptionsByFood).map(([foodId, selected]) => [foodId, [...selected.optionIds].sort()]))}`,
      comboId: combo.id,
      name: combo.name,
      quantity,
      unitPrice,
      selections: combo.items.map((comboItem) => ({
        foodId: comboItem.foodId,
        foodName: comboItem.foodName,
        optionIds: selectedOptionsByFood[comboItem.foodId]?.optionIds ?? [],
        optionNames: selectedOptionsByFood[comboItem.foodId]?.optionNames ?? [],
      })),
    })
  }

  return (
    <Sheet title={combo.name} onClose={onClose}>
      <p className="customer-muted">
        {combo.originalPrice > combo.price && <s>{formatVnd(combo.originalPrice)}</s>} <b>{formatVnd(combo.price)}</b>
      </p>
      {combo.items.map((comboItem) => (
        <div key={comboItem.foodId} className="customer-combo-item">
          <div>{comboItem.quantity} × {comboItem.foodName}</div>
          {comboItem.hasOptions && (
            <OptionPicker foodId={comboItem.foodId} onChange={(selected) => setSelectedOptionsByFood((previous) => ({ ...previous, [comboItem.foodId]: selected }))} />
          )}
        </div>
      ))}
      <div className="customer-sheet-foot">
        <QuantityStepper value={quantity} onChange={setQuantity} />
        <button className="customer-primary" onClick={handleAdd}>Thêm · {formatVnd(unitPrice * quantity)}</button>
      </div>
    </Sheet>
  )
}
