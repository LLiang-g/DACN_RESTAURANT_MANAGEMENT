package com.sccgroup.restaurant_management.pos.dto;


import java.time.LocalDateTime;
import java.util.List;

public record PendingOrderResponse(
        Long orderId,
        Long tableId,
        String tableNumber,
        String floor,
        LocalDateTime createdAt,
        List<PendingOrderItemResponse> items
) {}
