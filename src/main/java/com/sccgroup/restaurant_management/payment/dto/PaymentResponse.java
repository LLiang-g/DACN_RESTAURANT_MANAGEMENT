package com.sccgroup.restaurant_management.payment.dto;
import com.sccgroup.restaurant_management.domain.entity.billing.PaymentProviderType;
import com.sccgroup.restaurant_management.domain.entity.billing.PaymentTransactionStatus;
import java.math.BigDecimal;
public record PaymentResponse(String txnRef, PaymentProviderType provider, BigDecimal amount,
                              PaymentTransactionStatus status, String payUrl, String expiresAt) {}
