import { useState, type ReactNode } from "react"
import type { MenuCombo, MenuFood } from "./types"
import { EMPTY_PICK, formatVnd, type CartLine, type Pick } from "./cart"
import OptionPicker from "./OptionPicker"

export function Sheet({ title, onClose, children }: { title: string; onClose: () => void; children: ReactNode }) {
  return (
    <div className="cu-overlay" onClick={onClose}>
      <div className="cu-sheet" onClick={(e) => e.stopPropagation()}>
        <div className="cu-sheet-head">
          <h3>{title}</h3>
          <button className="cu-icon-btn" onClick={onClose} aria-label="Đóng">✕</button>
        </div>
        {children}
      </div>
    </div>
  )
}

export function QuantityStepper({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  return (
    <div className="cu-stepper">
      <button onClick={() => onChange(Math.max(1, value - 1))}>−</button>
      <span>{value}</span>
      <button onClick={() => onChange(Math.min(99, value + 1))}>+</button>
    </div>
  )
}

export function FoodModal({ food, onAdd, onClose }: { food: MenuFood; onAdd: (l: CartLine) => void; onClose: () => void }) {
  const [quantity, setQuantity] = useState(1)
  const [pick, setPick] = useState<Pick>(EMPTY_PICK)
  const unitPrice = food.price + pick.extra

  function add() {
    onAdd({
      kind: "food",
      key: `f${food.id}:${[...pick.optionIds].sort().join(",")}`,
      foodId: food.id,
      name: food.name,
      quantity,
      unitPrice,
      optionIds: pick.optionIds,
      optionNames: pick.optionNames,
    })
  }

  return (
    <Sheet title={food.name} onClose={onClose}>
      {food.description && <p className="cu-muted">{food.description}</p>}
      <OptionPicker foodId={food.id} onChange={setPick} />
      <div className="cu-sheet-foot">
        <QuantityStepper value={quantity} onChange={setQuantity} />
        <button className="cu-primary" onClick={add}>Thêm · {formatVnd(unitPrice * quantity)}</button>
      </div>
    </Sheet>
  )
}

export function ComboModal({ combo, onAdd, onClose }: { combo: MenuCombo; onAdd: (l: CartLine) => void; onClose: () => void }) {
  const [quantity, setQuantity] = useState(1)
  const [picks, setPicks] = useState<Record<number, Pick>>({})

  // phụ thu cho 1 combo = Σ (phụ thu option × số lượng món đó trong combo)
  const extra = combo.items.reduce((s, it) => s + (picks[it.foodId]?.extra ?? 0) * it.quantity, 0)
  const unitPrice = combo.price + extra

  function add() {
    onAdd({
      kind: "combo",
      key: `c${combo.id}:${JSON.stringify(Object.entries(picks).map(([id, p]) => [id, [...p.optionIds].sort()]))}`,
      comboId: combo.id,
      name: combo.name,
      quantity,
      unitPrice,
      selections: combo.items.map((it) => ({
        foodId: it.foodId,
        foodName: it.foodName,
        optionIds: picks[it.foodId]?.optionIds ?? [],
        optionNames: picks[it.foodId]?.optionNames ?? [],
      })),
    })
  }

  return (
    <Sheet title={combo.name} onClose={onClose}>
      <p className="cu-muted">
        {combo.originalPrice > combo.price && <s>{formatVnd(combo.originalPrice)}</s>} <b>{formatVnd(combo.price)}</b>
      </p>
      {combo.items.map((it) => (
        <div key={it.foodId} className="cu-combo-item">
          <div>{it.quantity} × {it.foodName}</div>
          {it.hasOptions && (
            <OptionPicker foodId={it.foodId} onChange={(p) => setPicks((prev) => ({ ...prev, [it.foodId]: p }))} />
          )}
        </div>
      ))}
      <div className="cu-sheet-foot">
        <QuantityStepper value={quantity} onChange={setQuantity} />
        <button className="cu-primary" onClick={add}>Thêm · {formatVnd(unitPrice * quantity)}</button>
      </div>
    </Sheet>
  )
}
