package com.sccgroup.restaurant_management.common.realtime;



public record KdsNewItemEvent(
        Long orderItemId,
        Long stationId,
        String foodName,
        Integer quantity,
        String note
) {}