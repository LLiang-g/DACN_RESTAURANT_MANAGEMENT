package com.sccgroup.restaurant_management.payment.provider;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Component;
import java.math.BigDecimal;
import java.net.URI;
import java.net.http.*;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.time.*;
import java.time.format.DateTimeFormatter;
import java.util.*;

@Component
@ConditionalOnProperty(name="vnpay.enabled", havingValue="true")
public class VnPayQueryClient {
    private static final DateTimeFormatter DATE = DateTimeFormatter.ofPattern("yyyyMMddHHmmss");
    private static final String[] REQUEST_FIELDS = {"vnp_RequestId","vnp_Version","vnp_Command","vnp_TmnCode",
            "vnp_TxnRef","vnp_TransactionDate","vnp_CreateDate","vnp_IpAddr","vnp_OrderInfo"};
    private static final String[] RESPONSE_FIELDS = {"vnp_ResponseId","vnp_Command","vnp_ResponseCode","vnp_Message",
            "vnp_TmnCode","vnp_TxnRef","vnp_Amount","vnp_BankCode","vnp_PayDate","vnp_TransactionNo",
            "vnp_TransactionType","vnp_TransactionStatus","vnp_OrderInfo","vnp_PromotionCode","vnp_PromotionAmount"};
    private final String tmnCode, secret, ip;
    private final URI endpoint;
    private final ObjectMapper mapper;
    private final HttpClient http = HttpClient.newBuilder().connectTimeout(Duration.ofSeconds(3))
            .followRedirects(HttpClient.Redirect.NEVER).build();

    public VnPayQueryClient(@Value("${vnpay.tmn-code}") String tmnCode,
            @Value("${vnpay.hash-secret}") String secret,
            @Value("${VNPAY_QUERY_URL:https://sandbox.vnpayment.vn/merchant_webapi/api/transaction}") String endpoint,
            @Value("${VNPAY_QUERY_IP:127.0.0.1}") String ip, ObjectMapper mapper) {
        this.tmnCode=tmnCode; this.secret=secret; this.ip=ip; this.mapper=mapper; this.endpoint=URI.create(endpoint);
        boolean local = Set.of("localhost","127.0.0.1","[::1]").contains(this.endpoint.getHost());
        if (!("https".equals(this.endpoint.getScheme()) || (local && "http".equals(this.endpoint.getScheme()))))
            throw new IllegalArgumentException("QueryDR URL must use HTTPS (HTTP allowed for local tests only)");
        if(tmnCode.isBlank() || secret.isBlank() || ip.isBlank()) throw new IllegalArgumentException("Missing QueryDR configuration");
    }

    public VnPayQueryResult query(String txnRef, BigDecimal expectedAmount, String transactionDate) {
        if(transactionDate==null || !transactionDate.matches("[0-9]{14}"))
            return VnPayQueryResult.unknown("ORIGINAL_DATE_MISSING");
        try {
            Map<String,String> request=new LinkedHashMap<>();
            request.put("vnp_RequestId",UUID.randomUUID().toString().replace("-",""));
            request.put("vnp_Version","2.1.0");request.put("vnp_Command","querydr");request.put("vnp_TmnCode",tmnCode);
            request.put("vnp_TxnRef",txnRef);request.put("vnp_TransactionDate",transactionDate);
            request.put("vnp_CreateDate",LocalDateTime.now(ZoneId.of("Asia/Ho_Chi_Minh")).format(DATE));
            request.put("vnp_IpAddr",ip);request.put("vnp_OrderInfo","Query payment " + txnRef);
            request.put("vnp_SecureHash",VnPayUtil.hmacSha512(secret,join(request,REQUEST_FIELDS)));
            HttpRequest httpRequest=HttpRequest.newBuilder(endpoint).timeout(Duration.ofSeconds(5))
                    .header("Content-Type","application/json").POST(HttpRequest.BodyPublishers.ofString(mapper.writeValueAsString(request))).build();
            HttpResponse<String> response=http.send(httpRequest,HttpResponse.BodyHandlers.ofString(StandardCharsets.UTF_8));
            if(response.statusCode()!=200) return VnPayQueryResult.unknown("QUERY_HTTP_ERROR");
            if(response.body().length()>65536) return VnPayQueryResult.unknown("QUERY_RESPONSE_TOO_LARGE");
            Map<String,String> fields=mapper.readValue(response.body(),new TypeReference<Map<String,String>>(){});
            return verify(fields,txnRef,expectedAmount);
        } catch(InterruptedException e) { Thread.currentThread().interrupt();return VnPayQueryResult.unknown("QUERY_INTERRUPTED");
        } catch(Exception e) { return VnPayQueryResult.unknown("QUERY_CONNECTION_OR_FORMAT_ERROR"); }
    }

    VnPayQueryResult verify(Map<String,String> fields, String txnRef, BigDecimal expectedAmount) {
        String signature=fields.get("vnp_SecureHash");
        if(signature==null || !signature.matches("[a-fA-F0-9]{128}")) return VnPayQueryResult.unknown("QUERY_SIGNATURE_INVALID");
        String expected=VnPayUtil.hmacSha512(secret,join(fields,RESPONSE_FIELDS));
        if(!MessageDigest.isEqual(expected.getBytes(StandardCharsets.UTF_8),signature.toLowerCase(Locale.ROOT).getBytes(StandardCharsets.UTF_8)))
            return VnPayQueryResult.unknown("QUERY_SIGNATURE_INVALID");
        if(!"00".equals(fields.get("vnp_ResponseCode"))) return VnPayQueryResult.unknown("QUERY_NOT_CONFIRMED");
        if(!tmnCode.equals(fields.get("vnp_TmnCode")) || !txnRef.equals(fields.get("vnp_TxnRef"))
                || !"querydr".equals(fields.get("vnp_Command")) || !"01".equals(fields.get("vnp_TransactionType")))
            return VnPayQueryResult.unknown("QUERY_IDENTITY_MISMATCH");
        try {
            String raw=fields.getOrDefault("vnp_Amount","");
            if(!raw.matches("[0-9]{1,18}")) return VnPayQueryResult.unknown("QUERY_AMOUNT_INVALID");
            BigDecimal amount=new BigDecimal(raw).movePointLeft(2);
            if(expectedAmount==null || amount.compareTo(expectedAmount)!=0) return VnPayQueryResult.unknown("QUERY_AMOUNT_MISMATCH");
            String status=fields.get("vnp_TransactionStatus");
            if("00".equals(status)) {
                String no=fields.get("vnp_TransactionNo");
                if(no==null || no.isBlank() || "0".equals(no)) return VnPayQueryResult.unknown("QUERY_TRANSACTION_NO_MISSING");
                return new VnPayQueryResult(VnPayQueryResult.Outcome.SUCCESS,"QUERY_SUCCESS",amount,no);
            }
            if("02".equals(status)) return new VnPayQueryResult(VnPayQueryResult.Outcome.FAILED,"QUERY_FAILED",amount,fields.get("vnp_TransactionNo"));
            return VnPayQueryResult.unknown("QUERY_UNRESOLVED_STATUS");
        } catch(RuntimeException e) { return VnPayQueryResult.unknown("QUERY_RESPONSE_INVALID"); }
    }
    static String join(Map<String,String> values,String[] fields) {
        return Arrays.stream(fields).map(k->Objects.toString(values.get(k),"")).collect(java.util.stream.Collectors.joining("|"));
    }
}
