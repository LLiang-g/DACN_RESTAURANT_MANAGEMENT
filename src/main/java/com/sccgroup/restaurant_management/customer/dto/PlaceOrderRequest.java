package com.sccgroup.restaurant_management.customer.dto;

import java.util.List;

/**
 * Yêu cầu gửi đơn của khách. Có thể gồm món lẻ (items) và/hoặc combo (combos).
 * Mỗi lần gửi luôn tạo MỘT Order mới, không gộp vào Order cũ.
 */
public record PlaceOrderRequest(
        Long tableId,
        List<OrderLine> items,
        List<OrderComboLine> combos) {

    /** Một món lẻ: món, số lượng, các option đã chọn (id trong bảng food_option). */
    public record OrderLine(Long foodId, Integer quantity, List<Long> optionIds) {}

    /** Một combo: combo, số lượng combo, và option cho từng món con (món con không chọn option thì bỏ qua). */
    public record OrderComboLine(Long comboId, Integer quantity, List<ComboItemSelection> items) {}

    public record ComboItemSelection(Long foodId, List<Long> optionIds) {}
}
