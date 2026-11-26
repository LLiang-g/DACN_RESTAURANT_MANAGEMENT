package com.sccgroup.restaurant_management.payment.controller;

import com.sccgroup.restaurant_management.domain.entity.billing.PaymentTransactionStatus;
import com.sccgroup.restaurant_management.payment.dto.MockWebhookRequest;
import com.sccgroup.restaurant_management.payment.service.PaymentService;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.http.HttpStatus;

import org.springframework.http.ResponseEntity;
import com.sccgroup.restaurant_management.common.exception.ErrorResponse;
import org.springframework.web.bind.annotation.*;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.util.Map;

@RestController
@RequestMapping("/api/payments/mock")
@ConditionalOnProperty(name = "payment.mock.enabled", havingValue = "true")
public class MockPaymentController {
    private final PaymentService paymentService;
    private final String secret;

    public MockPaymentController(PaymentService paymentService,
                                 @Value("${payment.mock.webhook-secret}") String secret) {
        this.paymentService = paymentService;
        if (secret == null || secret.isBlank()) {
            throw new IllegalStateException("Set MOCK_WEBHOOK_SECRET before enabling mock payments");
        }
        this.secret = secret;
    }

    @PostMapping("/webhook")
    public ResponseEntity<?> webhook(@RequestHeader(value = "X-Webhook-Secret", required = false) String header,
                                     @RequestBody MockWebhookRequest body) {
        if (header == null || !MessageDigest.isEqual(
                header.getBytes(StandardCharsets.UTF_8), secret.getBytes(StandardCharsets.UTF_8))) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(new ErrorResponse("INVALID_WEBHOOK_SECRET", "Sai khóa webhook"));
        }
        PaymentTransactionStatus status =
                paymentService.applyResult(body.txnRef(), body.amount(), body.success(), body.providerTxnNo());
        return ResponseEntity.ok(Map.of("txnRef", body.txnRef(), "status", status));
    }
}
