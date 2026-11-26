package com.sccgroup.restaurant_management.payment.controller;

import com.sccgroup.restaurant_management.common.exception.BusinessException;
import com.sccgroup.restaurant_management.common.exception.ResourceNotFoundException;
import com.sccgroup.restaurant_management.payment.provider.VnPayProvider;
import com.sccgroup.restaurant_management.payment.service.PaymentService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.util.Map;

@RestController
@RequestMapping("/api/payments/vnpay")
@ConditionalOnProperty(name = "vnpay.enabled", havingValue = "true")
public class VnPayController {

    private static final Logger log = LoggerFactory.getLogger(VnPayController.class);

    private final VnPayProvider vnPayProvider;
    private final PaymentService paymentService;
    private final com.sccgroup.restaurant_management.payment.service.PaymentReturnService returns;

    public VnPayController(VnPayProvider vnPayProvider, PaymentService paymentService,
                           com.sccgroup.restaurant_management.payment.service.PaymentReturnService returns) {
        this.returns = returns;
        this.vnPayProvider = vnPayProvider;
        this.paymentService = paymentService;
    }

    /** Verified IPN and verified QueryDR share the same settlement path. */
    @GetMapping("/ipn")
    public Map<String, String> ipn(@RequestParam Map<String, String> params) {
        if (!vnPayProvider.isValidSignature(params)) {
            return rsp("97", "Invalid signature");
        }

        BigDecimal amount;
        try {
            amount = new BigDecimal(params.get("vnp_Amount")).movePointLeft(2); // VNPay gửi số tiền x100
        } catch (Exception e) {
            return rsp("99", "Invalid amount");
        }

        boolean success = "00".equals(params.get("vnp_ResponseCode"))
                && "00".equals(params.get("vnp_TransactionStatus"));

        // Only a final failure is allowed to release the invoice for another payment.
        if (!success && !"02".equals(params.get("vnp_TransactionStatus"))) {
            return rsp("99", "Awaiting reconciliation");
        }

        try {
            paymentService.applyResult(params.get("vnp_TxnRef"), amount, success, params.get("vnp_TransactionNo"));
            return rsp("00", "Confirm Success");
        } catch (ResourceNotFoundException e) {
            return rsp("01", "Order not found");
        } catch (BusinessException e) {
            log.warn("IPN VNPay bị từ chối: {} - {}", e.getCode(), e.getMessage());
            return "PAYMENT_AMOUNT_MISMATCH".equals(e.getCode())
                    ? rsp("04", "Invalid amount")
                    : rsp("99", e.getCode());
        } catch (Exception e) {
            log.error("Lỗi xử lý IPN VNPay", e);
            return rsp("99", "Unknown error");
        }
    }

    /** Browser navigation only. Neither return nor result lookup applies a payment result. */
    @GetMapping("/return")
    public org.springframework.http.ResponseEntity<Void> returnPage(@RequestParam Map<String, String> params) {
        return org.springframework.http.ResponseEntity.status(303)
                .location(returns.returnLocation(params))
                .header("Cache-Control", "no-store")
                .header("Referrer-Policy", "no-referrer")
                .build();
    }

    @GetMapping("/result")
    public org.springframework.http.ResponseEntity<com.sccgroup.restaurant_management.payment.service.PaymentReturnService.Result> result(
            @RequestHeader(value="X-Payment-Result-Token", required=false) String token) {
        return org.springframework.http.ResponseEntity.ok()
                .header("Cache-Control", "no-store")
                .header("Referrer-Policy", "no-referrer")
                .body(returns.result(token));
    }

    private Map<String, String> rsp(String code, String message) {
        return Map.of("RspCode", code, "Message", message);
    }
}