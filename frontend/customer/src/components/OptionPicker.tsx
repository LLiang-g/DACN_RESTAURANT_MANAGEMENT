import { useEffect, useState } from "react"
import { getFood } from "../api/api"
import type { FoodDetail } from "../types/types"
import { formatVnd, type SelectedOptions } from "../store/cart"

interface Props {
  foodId: number
  onChange: (pick: SelectedOptions) => void
}

function buildSelectedOptions(detail: FoodDetail, selected: number[]): SelectedOptions {
  const selectedOptionList = detail.optionGroups.flatMap((optionGroup) => optionGroup.options).filter((option) => selected.includes(option.id))
  return {
    optionIds: selectedOptionList.map((option) => option.id),
    optionNames: selectedOptionList.map((option) => option.name),
    extra: selectedOptionList.reduce((sum, option) => sum + option.priceDelta, 0),
  }
}

/**
 * Tải chi tiết món và cho khách chọn size / thêm bớt.
 * Nhóm "chọn 1" là bắt buộc chọn đúng một nên được chọn sẵn phương án đầu tiên; nhóm "chọn nhiều" chọn tự do.
 */
export default function OptionPicker({ foodId, onChange }: Props) {
  const [detail, setDetail] = useState<FoodDetail | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [selected, setSelected] = useState<number[]>([])

  useEffect(() => {
    getFood(foodId)
      .then((foodDetail) => {
        const initial = foodDetail.optionGroups
          .filter((optionGroup) => optionGroup.selectionType === "SINGLE_CHOICE" && optionGroup.options.length > 0)
          .map((optionGroup) => optionGroup.options[0].id)
        setDetail(foodDetail)
        setSelected(initial)
        onChange(buildSelectedOptions(foodDetail, initial)) // báo cho modal cha biết lựa chọn mặc định (và phụ thu của nó)
      })
      .catch((loadError: Error) => setError(loadError.message))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [foodId])

  if (error) return <p className="customer-error">{error}</p>
  if (!detail) return <p className="customer-muted">Đang tải tùy chọn...</p>

  function toggle(groupId: number, optionId: number) {
    if (!detail) return
    const group = detail.optionGroups.find((optionGroup) => optionGroup.id === groupId)!
    let next: number[]
    if (group.selectionType === "SINGLE_CHOICE") {
      if (selected.includes(optionId)) return // bắt buộc có đúng một lựa chọn, không bỏ chọn được
      const sameGroup = group.options.map((option) => option.id)
      next = [...selected.filter((id) => !sameGroup.includes(id)), optionId]
    } else {
      next = selected.includes(optionId) ? selected.filter((id) => id !== optionId) : [...selected, optionId]
    }
    setSelected(next)
    onChange(buildSelectedOptions(detail, next))
  }

  return (
    <div>
      {detail.optionGroups.map((optionGroup) => (
        <div key={optionGroup.id} className="customer-group">
          <div className="customer-group-title">
            {optionGroup.name} <span className="customer-muted">{optionGroup.selectionType === "SINGLE_CHOICE" ? "(chọn 1)" : "(chọn nhiều, tùy ý)"}</span>
          </div>
          <div className="customer-chips">
            {optionGroup.options.map((option) => (
              <button
                key={option.id}
                type="button"
                className={"customer-chip" + (selected.includes(option.id) ? " active" : "")}
                onClick={() => toggle(optionGroup.id, option.id)}
              >
                {option.name}
                {option.priceDelta !== 0 && (
                  <span> {option.priceDelta > 0 ? "+" : "-"}{formatVnd(Math.abs(option.priceDelta))}</span>
                )}
              </button>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}
