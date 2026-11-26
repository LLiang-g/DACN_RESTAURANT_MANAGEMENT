package com.sccgroup.restaurant_management.pos.dto;

import com.sccgroup.restaurant_management.domain.entity.billing.PaymentMethod;

import java.math.BigDecimal;

public record PayRequest(
        PaymentMethod paymentMethod,
        BigDecimal amountReceived,      // bắt buộc nếu CASH
        String bankTransactionRef       // bắt buộc nếu BANK_TRANSFER
) {}