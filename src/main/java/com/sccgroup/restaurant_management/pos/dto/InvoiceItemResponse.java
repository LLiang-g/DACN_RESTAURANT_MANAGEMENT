package com.sccgroup.restaurant_management.pos.dto;

import java.math.BigDecimal;

public record InvoiceItemResponse(
        Long orderItemId,
        String foodName,
        Integer quantity,
        BigDecimal unitPrice,
        BigDecimal lineTotal,
        String status
) {}