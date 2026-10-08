import { useState, type ReactNode } from "react"
import type { MenuCombo, MenuFood } from "../types/types"
import { NO_SELECTED_OPTIONS, formatVnd, type CartLine, type SelectedOptions } from "../store/cart"
import OptionPicker from "./OptionPicker"

export function Sheet({ title, onClose, children }: { title: string; onClose: () => void; children: ReactNode }) {
  return (
    <div className="customer-overlay" onClick={onClose}>
      <div className="customer-sheet" onClick={(clickEvent) => clickEvent.stopPropagation()}>
        <div className="customer-sheet-head">
          <h3>{title}</h3>
          <button className="customer-icon-btn" onClick={onClose} aria-label="Đóng">✕</button>
        </div>
        {children}
      </div>
    </div>
  )
}

export function QuantityStepper({ value, onChange }: { value: number; onChange: (newValue: number) => void }) {
  return (
    <div className="customer-stepper">
      <button onClick={() => onChange(Math.max(1, value - 1))}>−</button>
      <span>{value}</span>
      <button onClick={() => onChange(Math.min(99, value + 1))}>+</button>
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
