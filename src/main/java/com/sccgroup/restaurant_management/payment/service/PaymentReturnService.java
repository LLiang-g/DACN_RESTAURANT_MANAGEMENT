package com.sccgroup.restaurant_management.payment.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.sccgroup.restaurant_management.common.exception.BusinessException;
import com.sccgroup.restaurant_management.common.exception.ResourceNotFoundException;
import com.sccgroup.restaurant_management.domain.entity.billing.*;
import com.sccgroup.restaurant_management.domain.repository.billing.*;
import com.sccgroup.restaurant_management.payment.provider.VnPayProvider;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.math.BigDecimal;
import java.net.URI;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.time.Clock;
import java.util.*;

/** Read-only, short-lived browser capability. It cannot be used as a staff JWT or to collect money. */
@Service
@ConditionalOnProperty(name="vnpay.enabled",havingValue="true")
public class PaymentReturnService {
    private static final String SCOPE = "customer-payment-result-v1";
    private final PaymentTransactionRepository transactions;
    private final CollectionCaseRepository cases;
    private final VnPayProvider provider;
    private final ObjectMapper json;
    private final byte[] key;
    private final String frontendBase;
    private final int ttlSeconds;
    private final Clock clock;
    public record Ticket(String scope,String txnRef,String hint,long expiresAt) {}
    public record Result(String txnRef,BigDecimal amount,String paymentStatus,String invoiceStatus,
                         Long tableId,String returnHint,boolean needsAttention) {}

    @Autowired
    public PaymentReturnService(PaymentTransactionRepository transactions,CollectionCaseRepository cases,
            VnPayProvider provider,ObjectMapper json,@Value("${jwt.secret}") String secret,
            @Value("${CUSTOMER_PUBLIC_BASE_URL:http://localhost:5173}") String frontendBase,
            @Value("${PAYMENT_RESULT_TOKEN_TTL_SECONDS:1800}") int ttlSeconds) {
        this(transactions,cases,provider,json,secret,frontendBase,ttlSeconds,Clock.systemUTC());
    }

    PaymentReturnService(PaymentTransactionRepository transactions,CollectionCaseRepository cases,
            VnPayProvider provider,ObjectMapper json,String secret,String frontendBase,int ttlSeconds,Clock clock) {
        this.transactions=transactions;this.cases=cases;this.provider=provider;this.json=json;this.clock=clock;
        this.key=Base64.getDecoder().decode(secret);
        if(key.length<32)throw new IllegalArgumentException("JWT_SECRET must contain at least 32 bytes");
        if(ttlSeconds<60||ttlSeconds>3600)throw new IllegalArgumentException("Payment result token TTL must be 60..3600 seconds");
        this.ttlSeconds=ttlSeconds;
        URI uri=URI.create(frontendBase.trim());
        if(!("https".equalsIgnoreCase(uri.getScheme())||"http".equalsIgnoreCase(uri.getScheme()))
                ||uri.getHost()==null||uri.getRawUserInfo()!=null||uri.getRawQuery()!=null||uri.getRawFragment()!=null
                ||!(uri.getRawPath()==null||uri.getRawPath().isEmpty()||"/".equals(uri.getRawPath()))) {
            throw new IllegalArgumentException("CUSTOMER_PUBLIC_BASE_URL must be an absolute HTTP(S) customer origin, without a path/query/fragment");
        }
        this.frontendBase=uri.toString().replaceAll("/+$", "");
    }

    @Transactional(readOnly=true)
    public URI returnLocation(Map<String,String> params) {
        if(!provider.isValidSignature(params))return invalidLocation();
        String ref=params.get("vnp_TxnRef");
        if(ref==null||ref.isBlank()||ref.length()>64)return invalidLocation();
        var found=transactions.findByTxnRef(ref);
        if(found.isEmpty()||found.get().getProvider()!=PaymentProviderType.VNPAY)return invalidLocation();
        BigDecimal amount;
        try{amount=new BigDecimal(params.get("vnp_Amount")).movePointLeft(2);}catch(RuntimeException e){return invalidLocation();}
        if(amount.compareTo(found.get().getAmount())!=0)return invalidLocation();
        String code=params.get("vnp_ResponseCode");
        String hint="24".equals(code)?"CANCELLED":"00".equals(code)?"RETURNED":"UNSUCCESSFUL";
        return URI.create(frontendBase+"/payment/result#token="+issue(ref,hint));
    }

    public URI invalidLocation(){return URI.create(frontendBase+"/payment/result#return=invalid");}

    private String issue(String ref,String hint) {
        try {
            var ticket=new Ticket(SCOPE,ref,hint,clock.instant().getEpochSecond()+ttlSeconds);
            String data=Base64.getUrlEncoder().withoutPadding().encodeToString(json.writeValueAsBytes(ticket));
            return data+"."+Base64.getUrlEncoder().withoutPadding().encodeToString(sign(data));
        }catch(Exception e){throw new IllegalStateException("Cannot issue payment result ticket",e);}
    }

    private byte[] sign(String value) {
        try{Mac mac=Mac.getInstance("HmacSHA256");mac.init(new SecretKeySpec(key,"HmacSHA256"));return mac.doFinal((SCOPE+":"+value).getBytes(StandardCharsets.US_ASCII));}
        catch(Exception e){throw new IllegalStateException("Cannot sign payment result ticket",e);}
    }

    private Ticket verify(String token) {
        if(token==null||token.length()>4096)throw invalidToken();
        String[] parts=token.split("\\.",-1);
        if(parts.length!=2||parts[0].isEmpty()||parts[1].isEmpty())throw invalidToken();
        Ticket ticket;
        try {
            byte[] actual=Base64.getUrlDecoder().decode(parts[1]);
            if(!MessageDigest.isEqual(sign(parts[0]),actual))throw invalidToken();
            ticket=json.readValue(Base64.getUrlDecoder().decode(parts[0]),Ticket.class);
        }catch(BusinessException e){throw e;}catch(Exception e){throw invalidToken();}
        if(!SCOPE.equals(ticket.scope())||ticket.txnRef()==null||ticket.txnRef().isBlank()||ticket.txnRef().length()>64
                ||!Set.of("RETURNED","CANCELLED","UNSUCCESSFUL").contains(ticket.hint()))throw invalidToken();
        long now=clock.instant().getEpochSecond();
        if(ticket.expiresAt()<=now)throw new BusinessException("PAYMENT_RESULT_LINK_EXPIRED","Liên kết xem kết quả đã hết hạn. Vui lòng kiểm tra với nhân viên nhà hàng.");
        if(ticket.expiresAt()>now+3600)throw invalidToken();
        return ticket;
    }

    private BusinessException invalidToken(){return new BusinessException("PAYMENT_RESULT_TOKEN_INVALID","Liên kết kết quả không hợp lệ. Vui lòng quét lại mã bàn hoặc liên hệ nhân viên.");}

    @Transactional(readOnly=true)
    public Result result(String token) {
        Ticket ticket=verify(token);
        PaymentTransaction tx=transactions.findByTxnRef(ticket.txnRef())
                .filter(t->t.getProvider()==PaymentProviderType.VNPAY)
                .orElseThrow(()->new ResourceNotFoundException("Không tìm thấy giao dịch thanh toán"));
        var invoice=tx.getInvoice();
        boolean attention=cases.forInvoice(invoice.getId()).stream()
                .anyMatch(c->Set.of("REVIEW","REQUIRED","PROCESSING").contains(c.getStatus()));
        return new Result(tx.getTxnRef(),tx.getAmount(),tx.getStatus().name(),invoice.getStatus().name(),
                invoice.getTable().getId(),ticket.hint(),attention);
    }
}
