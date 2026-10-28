package com.sccgroup.restaurant_management.pos.dto;

import java.time.LocalDateTime;

public record CallStaffRequestResponse(
        Long requestId,
        Long tableId,
        String tableNumber,
        String floor,
        LocalDateTime createdAt
) {}