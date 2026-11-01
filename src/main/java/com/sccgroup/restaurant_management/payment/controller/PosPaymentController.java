package com.sccgroup.restaurant_management.payment.controller;

import com.sccgroup.restaurant_management.common.exception.BusinessException;
import com.sccgroup.restaurant_management.payment.dto.CreatePaymentRequest;
import com.sccgroup.restaurant_management.payment.dto.PaymentResponse;
import com.sccgroup.restaurant_management.payment.service.PaymentService;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/pos")
public class PosPaymentController {
    private final PaymentService paymentService;
    public PosPaymentController(PaymentService paymentService) { this.paymentService = paymentService; }

    @PostMapping("/invoices/{invoiceId}/payments")
    public ResponseEntity<PaymentResponse> create(@PathVariable Long invoiceId,
                                                  @RequestBody CreatePaymentRequest body,
                                                  HttpServletRequest request) {
        if (body.provider() == null) {
            throw new BusinessException("PAYMENT_PROVIDER_REQUIRED", "Phải chọn phương thức thanh toán");
        }
        PaymentResponse res = paymentService.create(invoiceId, body.provider(), request.getRemoteAddr());
        return ResponseEntity.status(HttpStatus.CREATED).body(res);
    }

    @GetMapping("/payments/{txnRef}")
    public PaymentResponse get(@PathVariable String txnRef) {
        return paymentService.get(txnRef);
    }
}