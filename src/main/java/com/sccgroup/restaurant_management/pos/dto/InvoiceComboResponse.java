package com.sccgroup.restaurant_management.pos.dto;

import java.math.BigDecimal;
import java.util.List;

public record InvoiceComboResponse(
        Long orderComboId,
        String comboName,
        Integer quantity,
        BigDecimal comboPrice,
        BigDecimal lineTotal,
        List<InvoiceComboItemResponse> items
) {}