package com.sccgroup.restaurant_management.payment.service;
import com.sccgroup.restaurant_management.domain.entity.billing.PaymentTransactionStatus;
import java.util.List;
public final class UnresolvedPayments {
    private UnresolvedPayments() {}
    public static final List<PaymentTransactionStatus> STATUSES = List.of(
            PaymentTransactionStatus.PENDING, PaymentTransactionStatus.RECONCILING, PaymentTransactionStatus.EXPIRED);
}
