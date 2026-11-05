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

    public VnPayController(VnPayProvider vnPayProvider, PaymentService paymentService) {
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

    /** Trình duyệt của khách được đưa về đây sau khi thanh toán. Chỉ hiển thị, KHÔNG đóng hóa đơn. */
    @GetMapping(value = "/return", produces = "text/html;charset=UTF-8")
    public String returnPage(@RequestParam Map<String, String> params) {
        String message;
        if (!vnPayProvider.isValidSignature(params)) {
            message = "Dữ liệu trả về không hợp lệ.";
        } else if ("00".equals(params.get("vnp_ResponseCode"))) {
            message = "Thanh toán thành công. Bạn có thể đóng trang này.";
        } else if ("24".equals(params.get("vnp_ResponseCode"))) {
            message = "Bạn đã hủy giao dịch.";
        } else {
            message = "Thanh toán chưa thành công. Vui lòng thử lại hoặc liên hệ nhân viên.";
        }
        return "<!doctype html><html lang=\"vi\"><head><meta charset=\"utf-8\">"
                + "<meta name=\"viewport\" content=\"width=device-width, initial-scale=1\">"
                + "<title>Kết quả thanh toán</title></head>"
                + "<body style=\"font-family:sans-serif;text-align:center;padding:48px 16px\">"
                + "<h2>" + message + "</h2></body></html>";
    }

    private Map<String, String> rsp(String code, String message) {
        return Map.of("RspCode", code, "Message", message);
    }
}