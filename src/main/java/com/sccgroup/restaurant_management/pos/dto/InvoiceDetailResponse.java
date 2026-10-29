package com.sccgroup.restaurant_management.pos.dto;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

public record InvoiceDetailResponse(
        Long invoiceId,
        Long tableId,
        String tableNumber,
        String floor,
        String status,
        List<InvoiceItemResponse> items,
        List<InvoiceComboResponse> combos,
        BigDecimal totalAmount,
        String paymentMethod,
        BigDecimal amountReceived,
        BigDecimal changeAmount,
        String bankTransactionRef,
        LocalDateTime paidAt
) {}