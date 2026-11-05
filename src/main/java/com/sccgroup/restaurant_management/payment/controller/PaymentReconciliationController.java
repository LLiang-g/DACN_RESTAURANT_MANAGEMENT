package com.sccgroup.restaurant_management.payment.controller;
import com.sccgroup.restaurant_management.payment.dto.PaymentResponse;
import com.sccgroup.restaurant_management.payment.service.PaymentReconciliationService;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.web.bind.annotation.*;
@RestController
@RequestMapping("/api/pos/payments")
@ConditionalOnProperty(name="vnpay.enabled",havingValue="true")
public class PaymentReconciliationController {
    private final PaymentReconciliationService service;
    public PaymentReconciliationController(PaymentReconciliationService service){this.service=service;}
    @PostMapping("/{txnRef}/reconcile")
    public PaymentResponse reconcile(@PathVariable String txnRef){return service.reconcile(txnRef);}
}
