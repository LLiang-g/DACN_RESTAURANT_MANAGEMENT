package com.sccgroup.restaurant_management.payment.dto;

import com.sccgroup.restaurant_management.domain.entity.billing.PaymentProviderType;

public record CreatePaymentRequest(PaymentProviderType provider) {}
