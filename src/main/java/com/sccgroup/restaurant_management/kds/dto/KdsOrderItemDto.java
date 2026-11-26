package com.sccgroup.restaurant_management.kds.dto;

import com.sccgroup.restaurant_management.domain.entity.order.OrderItemStatus;
import java.time.LocalDateTime;
import java.util.List;

/** Một món trên màn hình bếp. Tên field khớp kiểu KdsOrderItem bên frontend. */
public record KdsOrderItemDto(
        Long id,
        String foodName,
        Integer quantity,
        OrderItemStatus status,
        Long stationId,
        String stationName,
        Integer estimatedCookingTime, // phút
        LocalDateTime startedCookingAt,
        LocalDateTime doneAt,
        List<String> options,
        String note,                  // hiện luôn null: OrderItem.note chỉ dùng cho lý do từ chối/trả món
        String comboName              // null nếu gọi lẻ
) {}
