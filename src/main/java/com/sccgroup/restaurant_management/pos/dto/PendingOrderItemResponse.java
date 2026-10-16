package com.sccgroup.restaurant_management.pos.dto;

import java.math.BigDecimal;
import java.util.List;

public record PendingOrderItemResponse(
        Long orderItemId,
        Long foodId,
        String foodName,
        Integer quantity,
        String note,
        BigDecimal unitPrice,
        List<String> options
) {}