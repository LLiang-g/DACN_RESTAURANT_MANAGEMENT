package com.sccgroup.restaurant_management.payment.provider;
import java.time.LocalDateTime;
public record PaymentInitResult(String payUrl, LocalDateTime expiresAt) {
    public PaymentInitResult(String payUrl) { this(payUrl, null); }
}
