package com.sccgroup.restaurant_management.kds.dto;

import java.time.LocalDateTime;
import java.util.List;

/** Một thẻ order trên màn hình bếp. Tên field khớp kiểu KdsOrder bên frontend. */
public record KdsOrderDto(
        Long id,
        String floor,
        String tableNumber,
        LocalDateTime createdAt,
        List<KdsOrderItemDto> items
) {}
