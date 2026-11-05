package com.sccgroup.restaurant_management.payment.provider;

import com.sccgroup.restaurant_management.domain.entity.billing.PaymentProviderType;
import com.sccgroup.restaurant_management.domain.entity.billing.PaymentTransaction;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Component;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.util.HashMap;
import java.util.Locale;
import java.util.Map;

@Component
@ConditionalOnProperty(name = "vnpay.enabled", havingValue = "true")
public class VnPayProvider implements PaymentProvider {

    private static final ZoneId VN_ZONE = ZoneId.of("Asia/Ho_Chi_Minh");
    private static final DateTimeFormatter DATE_FMT =
            DateTimeFormatter.ofPattern("yyyyMMddHHmmss");

    private final int expireSeconds;
    private final String tmnCode;
    private final String hashSecret;
    private final String payUrl;
    private final String publicBaseUrl;

    public VnPayProvider(
            @Value("${vnpay.tmn-code}") String tmnCode,
            @Value("${vnpay.hash-secret}") String hashSecret,
            @Value("${vnpay.pay-url}") String payUrl,
            @Value("${app.public-base-url}") String publicBaseUrl,
            @Value("${VNPAY_EXPIRE_SECONDS:90}") int expireSeconds) {

        if (tmnCode.isBlank() || hashSecret.isBlank()) {
            throw new IllegalStateException(
                    "Thiếu VNPAY_TMN_CODE hoặc VNPAY_HASH_SECRET");
        }

        if (expireSeconds < 30 || expireSeconds > 1800) {
            throw new IllegalArgumentException(
                    "VNPAY_EXPIRE_SECONDS must be between 30 and 1800");
        }

        this.expireSeconds = expireSeconds;
        this.tmnCode = tmnCode;
        this.hashSecret = hashSecret;
        this.payUrl = payUrl;
        this.publicBaseUrl = publicBaseUrl;
    }

    @Override
    public PaymentProviderType type() {
        return PaymentProviderType.VNPAY;
    }

    @Override
    public PaymentInitResult initiate(
            PaymentTransaction tx,
            String clientIp) {

        LocalDateTime now = LocalDateTime.now(VN_ZONE).withNano(0);
        LocalDateTime expiresAt = now.plusSeconds(expireSeconds);

        Map<String, String> params = new HashMap<>();
        params.put("vnp_Version", "2.1.0");
        params.put("vnp_Command", "pay");
        params.put("vnp_TmnCode", tmnCode);

        params.put(
                "vnp_Amount",
                String.valueOf(
                        tx.getAmount().movePointRight(2).longValueExact()));

        params.put("vnp_CurrCode", "VND");
        params.put("vnp_TxnRef", tx.getTxnRef());
        params.put(
                "vnp_OrderInfo",
                "Thanh toan hoa don " + tx.getInvoice().getId());

        params.put("vnp_OrderType", "other");
        params.put("vnp_Locale", "vn");
        params.put(
                "vnp_ReturnUrl",
                publicBaseUrl + "/api/payments/vnpay/return");

        params.put("vnp_IpAddr", normalizeIp(clientIp));
        params.put("vnp_CreateDate", now.format(DATE_FMT));
        params.put("vnp_ExpireDate", expiresAt.format(DATE_FMT));

        String hashData = VnPayUtil.buildHashData(params);
        String secureHash =
                VnPayUtil.hmacSha512(hashSecret, hashData);

        String paymentUrl =
                payUrl + "?" + hashData + "&vnp_SecureHash=" + secureHash;

        return new PaymentInitResult(paymentUrl, expiresAt);
    }

    public boolean isValidSignature(Map<String, String> receivedParams) {
        if (!tmnCode.equals(receivedParams.get("vnp_TmnCode"))) return false;
        String receivedHash = receivedParams.get("vnp_SecureHash");
        if (receivedHash == null) {
            return false;
        }

        Map<String, String> toSign = new HashMap<>(receivedParams);
        toSign.remove("vnp_SecureHash");
        toSign.remove("vnp_SecureHashType");

        String expected = VnPayUtil.hmacSha512(
                hashSecret,
                VnPayUtil.buildHashData(toSign));

        return MessageDigest.isEqual(
                expected.getBytes(StandardCharsets.UTF_8),
                receivedHash.toLowerCase(Locale.ROOT)
                        .getBytes(StandardCharsets.UTF_8));
    }

    private String normalizeIp(String ip) {
        if (ip == null || ip.isBlank() || ip.contains(":")) {
            return "127.0.0.1";
        }
        return ip;
    }
}