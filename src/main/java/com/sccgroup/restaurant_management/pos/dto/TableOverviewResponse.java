package com.sccgroup.restaurant_management.pos.dto;

import java.time.LocalDateTime;

public record TableOverviewResponse(
        Long tableId,
        String tableNumber,
        String floor,
        String status,
        Long invoiceId,
        LocalDateTime openedAt
) {}