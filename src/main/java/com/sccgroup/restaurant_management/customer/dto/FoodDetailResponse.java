package com.sccgroup.restaurant_management.customer.dto;

import com.sccgroup.restaurant_management.domain.entity.menu.SelectionType;

import java.math.BigDecimal;
import java.util.List;

/** Chi tiết một món kèm các nhóm tùy chọn để khách chọn (size, độ cay, thêm/bớt...). */
public record FoodDetailResponse(
        Long id,
        String name,
        BigDecimal price,
        String image,
        String description,
        Integer estimatedCookingTime,
        boolean available,
        List<OptionGroupDto> optionGroups) {

    public record OptionGroupDto(Long id, String name, SelectionType selectionType, List<OptionDto> options) {}

    /** priceDelta = 0 nếu tùy chọn không đổi giá. Không lộ thông tin nguyên liệu. */
    public record OptionDto(Long id, String name, BigDecimal priceDelta) {}
}
