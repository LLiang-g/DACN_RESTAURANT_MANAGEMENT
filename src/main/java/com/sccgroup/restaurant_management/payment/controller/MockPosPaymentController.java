package com.sccgroup.restaurant_management.payment.controller;

import com.sccgroup.restaurant_management.payment.service.PaymentService;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

@RestController
@RequestMapping("/api/pos/payments")
@ConditionalOnProperty(name = "payment.mock.enabled", havingValue = "true")
public class MockPosPaymentController {
    private final PaymentService paymentService;

    public MockPosPaymentController(PaymentService paymentService) {
        this.paymentService = paymentService;
    }

    @PostMapping("/{txnRef}/mock-confirm")
    public Map<String, Object> mockConfirm(@PathVariable String txnRef) {
        return Map.of("txnRef", txnRef, "status", paymentService.mockConfirm(txnRef));
    }
}
