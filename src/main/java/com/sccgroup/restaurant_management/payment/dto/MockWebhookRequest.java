package com.sccgroup.restaurant_management.payment.dto;

import java.math.BigDecimal;

public record MockWebhookRequest(String txnRef, BigDecimal amount, boolean success, String providerTxnNo) {}
