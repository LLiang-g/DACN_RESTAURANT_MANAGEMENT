package com.sccgroup.restaurant_management.customer.dto;

import java.math.BigDecimal;
import java.util.List;

/**
 * Thực đơn cho khách: các danh mục món + danh sách combo (hiển thị như một danh mục riêng).
 * Khách chỉ thấy "còn/tạm hết" (available), không thấy số liệu tồn kho.
 */
public record MenuResponse(List<CategoryDto> categories, List<ComboDto> combos) {

    public record CategoryDto(Long id, String name, List<FoodDto> foods) {}

    public record FoodDto(
            Long id,
            String name,
            BigDecimal price,
            String image,
            String description,
            Integer estimatedCookingTime,
            boolean available,
            Integer remainingPortions, // null = không giới hạn (món chưa có công thức)
            boolean hasOptions) {}

    public record ComboDto(
            Long id,
            String name,
            BigDecimal price,
            BigDecimal originalPrice,
            boolean available,
            Integer remainingPortions,
            List<ComboItemDto> items) {}

    public record ComboItemDto(Long foodId, String foodName, Integer quantity, boolean hasOptions) {}
}
