package com.sccgroup.restaurant_management.common.realtime;

public record OrderItemStatusEvent(
        Long orderItemId,
        Long tableId,
        String status,
        String note
) {}