import type { AdjustType } from "../types";

/** Một option của món (dùng cả cho danh sách tạm khi món chưa lưu). */
export interface OptionDraft {
  name: string;
  groupId: number;
  ingredientId: number; // 0 = không điều chỉnh nguyên liệu
  adjustAmount: number;
  adjustType: AdjustType;
  priceDelta: number;
  scaleFactor: number;
}

/** Đổi dữ liệu form option sang body gửi API (giống logic của form option cũ). */
export function optionPayload(foodId: number, form: OptionDraft) {
  return {
    foodId,
    name: form.name.trim(),
    groupId: form.groupId,
    ingredientId: form.ingredientId > 0 ? form.ingredientId : null,
    adjustAmount: form.adjustAmount > 0 ? form.adjustAmount : null,
    adjustType: form.adjustAmount > 0 ? form.adjustType : null,
    priceDelta: form.priceDelta,
    scaleFactor: form.scaleFactor,
  };
}
