package com.sccgroup.restaurant_management.pos.dto;

import java.math.BigDecimal;
import java.util.List;

public record InvoiceDetailResponse(
        Long invoiceId,
        Long tableId,
        String tableNumber,
        String floor,
        String status,
        List<InvoiceItemResponse> items,
        BigDecimal totalAmount
) {}