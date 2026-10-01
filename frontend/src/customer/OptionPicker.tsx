import { useEffect, useState } from "react"
import { getFood } from "./api"
import type { FoodDetail } from "./types"
import { formatVnd, type Pick } from "./cart"

interface Props {
  foodId: number
  onChange: (pick: Pick) => void
}

/** Tải chi tiết món và cho khách chọn size / thêm bớt. Không bắt buộc chọn. */
export default function OptionPicker({ foodId, onChange }: Props) {
  const [detail, setDetail] = useState<FoodDetail | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [selected, setSelected] = useState<number[]>([])

  useEffect(() => {
    getFood(foodId)
      .then(setDetail)
      .catch((e: Error) => setError(e.message))
  }, [foodId])

  if (error) return <p className="cu-error">{error}</p>
  if (!detail) return <p className="cu-muted">Đang tải tùy chọn...</p>

  function toggle(groupId: number, optionId: number) {
    if (!detail) return
    const group = detail.optionGroups.find((g) => g.id === groupId)!
    let next: number[]
    if (selected.includes(optionId)) {
      next = selected.filter((id) => id !== optionId)
    } else if (group.selectionType === "SINGLE_CHOICE") {
      const sameGroup = group.options.map((o) => o.id)
      next = [...selected.filter((id) => !sameGroup.includes(id)), optionId]
    } else {
      next = [...selected, optionId]
    }
    setSelected(next)

    const all = detail.optionGroups.flatMap((g) => g.options).filter((o) => next.includes(o.id))
    onChange({
      optionIds: all.map((o) => o.id),
      optionNames: all.map((o) => o.name),
      extra: all.reduce((s, o) => s + o.priceDelta, 0),
    })
  }

  return (
    <div>
      {detail.optionGroups.map((g) => (
        <div key={g.id} className="cu-group">
          <div className="cu-group-title">
            {g.name} <span className="cu-muted">{g.selectionType === "SINGLE_CHOICE" ? "(chọn 1)" : "(chọn nhiều)"}</span>
          </div>
          <div className="cu-chips">
            {g.options.map((o) => (
              <button
                key={o.id}
                type="button"
                className={"cu-chip" + (selected.includes(o.id) ? " active" : "")}
                onClick={() => toggle(g.id, o.id)}
              >
                {o.name}
                {o.priceDelta !== 0 && (
                  <span> {o.priceDelta > 0 ? "+" : "-"}{formatVnd(Math.abs(o.priceDelta))}</span>
                )}
              </button>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}
