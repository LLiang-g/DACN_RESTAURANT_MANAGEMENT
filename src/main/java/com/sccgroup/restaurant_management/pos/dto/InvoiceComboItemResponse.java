package com.sccgroup.restaurant_management.pos.dto;

public record InvoiceComboItemResponse(
        String foodName,
        Integer quantity,
        String status
) {}