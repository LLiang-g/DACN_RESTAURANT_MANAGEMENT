package com.sccgroup.restaurant_management.common.realtime;

public record TableStatusEvent(
        Long tableId,
        String status
) {}