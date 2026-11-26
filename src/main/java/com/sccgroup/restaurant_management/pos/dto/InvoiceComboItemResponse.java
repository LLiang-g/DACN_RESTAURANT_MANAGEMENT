package com.sccgroup.restaurant_management.pos.dto;

public record InvoiceComboItemResponse(
        Long orderItemId,
        String foodName,
        Integer quantity,
        String status
) {}