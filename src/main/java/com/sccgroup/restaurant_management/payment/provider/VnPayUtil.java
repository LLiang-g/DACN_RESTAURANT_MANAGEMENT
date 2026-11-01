package com.sccgroup.restaurant_management.payment.provider;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.security.GeneralSecurityException;
import java.util.Map;
import java.util.TreeMap;
import java.util.stream.Collectors;

public final class VnPayUtil {
    private VnPayUtil() {}

    public static String hmacSha512(String key, String data) {
        try {
            Mac mac = Mac.getInstance("HmacSHA512");
            mac.init(new SecretKeySpec(key.getBytes(StandardCharsets.UTF_8), "HmacSHA512"));
            byte[] bytes = mac.doFinal(data.getBytes(StandardCharsets.UTF_8));
            StringBuilder sb = new StringBuilder(bytes.length * 2);
            for (byte b : bytes) sb.append(String.format("%02x", b));
            return sb.toString();
        } catch (GeneralSecurityException e) {
            throw new IllegalStateException("Không tạo được chữ ký HMAC-SHA512", e);
        }
    }

    /**
     * Sắp xếp tham số theo tên (A-Z), nối "tên=giá_trị" bằng '&', giá trị được mã hóa URL.
     * Bỏ qua tham số rỗng. Chuỗi này vừa để ký, vừa dùng làm query string.
     */
    public static String buildHashData(Map<String, String> params) {
        return new TreeMap<>(params).entrySet().stream()
                .filter(e -> e.getValue() != null && !e.getValue().isEmpty())
                .map(e -> e.getKey() + "=" + URLEncoder.encode(e.getValue(), StandardCharsets.US_ASCII))
                .collect(Collectors.joining("&"));
    }
}