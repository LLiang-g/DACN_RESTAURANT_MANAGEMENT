package com.sccgroup.restaurant_management.payment.service;

import com.sccgroup.restaurant_management.common.exception.ResourceNotFoundException;
import com.sccgroup.restaurant_management.common.realtime.RealtimeEventPublisher;
import com.sccgroup.restaurant_management.domain.entity.billing.*;
import com.sccgroup.restaurant_management.domain.repository.billing.*;
import com.sccgroup.restaurant_management.payment.provider.VnPayQueryResult;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;
import java.math.BigDecimal;
import java.net.URI;
import java.net.URLDecoder;
import java.nio.charset.StandardCharsets;
import java.time.*;
import java.util.Map;

@Service
@ConditionalOnProperty(name="vnpay.enabled",havingValue="true")
public class PaymentReconciliationStore {
    private final InvoiceRepository invoices;
    private final PaymentTransactionRepository transactions;
    private final PaymentService payments;
    private final RealtimeEventPublisher events;
    private final int retrySeconds;
    public record Snapshot(String txnRef, BigDecimal amount, String transactionDate) {}
    public PaymentReconciliationStore(InvoiceRepository invoices, PaymentTransactionRepository transactions,
            PaymentService payments, RealtimeEventPublisher events,
            @Value("${VNPAY_QUERY_RETRY_SECONDS:60}") int retrySeconds) {
        if(retrySeconds<15 || retrySeconds>3600) throw new IllegalArgumentException("Query retry must be 15..3600 seconds");
        this.invoices=invoices;this.transactions=transactions;this.payments=payments;this.events=events;this.retrySeconds=retrySeconds;
    }
    private LocalDateTime now(){return LocalDateTime.now(ZoneId.of("Asia/Ho_Chi_Minh"));}
    private PaymentTransaction lock(String ref) {
        Long invoiceId=transactions.findInvoiceIdByTxnRef(ref).orElseThrow(()->new ResourceNotFoundException("Không tìm thấy giao dịch"));
        invoices.findByIdForUpdate(invoiceId).orElseThrow(()->new ResourceNotFoundException("Không tìm thấy hóa đơn"));
        return transactions.findByTxnRefForUpdate(ref).orElseThrow(()->new ResourceNotFoundException("Không tìm thấy giao dịch"));
    }
    @Transactional(propagation=Propagation.REQUIRES_NEW,isolation=org.springframework.transaction.annotation.Isolation.READ_COMMITTED)
    public Snapshot claim(String ref) {
        PaymentTransaction tx=lock(ref);LocalDateTime now=now();
        if(tx.getProvider()!=PaymentProviderType.VNPAY || !UnresolvedPayments.STATUSES.contains(tx.getStatus()))return null;
        if(tx.getExpiresAt()==null && tx.getStatus()!=PaymentTransactionStatus.EXPIRED)return null;
        if(tx.getExpiresAt()!=null && now.isBefore(tx.getExpiresAt()))return null;
        if(tx.getNextReconcileAt()!=null && now.isBefore(tx.getNextReconcileAt()))return null;
        tx.setStatus(PaymentTransactionStatus.RECONCILING);
        // A short persistent lease also prevents duplicate manual/background calls across instances.
        tx.recordReconciliation(now.plusSeconds(retrySeconds),"QUERY_IN_PROGRESS");
        events.publishAfterCommit("/topic/pos",Map.of("type","PAYMENT_RECONCILING","txnRef",ref));
        return new Snapshot(ref,tx.getAmount(),originalDate(tx.getPayUrl()));
    }
    static String originalDate(String url) {
        if(url==null)return null;
        try {
            String query=URI.create(url).getRawQuery();if(query==null)return null;String result=null;
            for(String pair:query.split("&")) {
                String[] kv=pair.split("=",2);
                if(kv.length==2 && "vnp_CreateDate".equals(URLDecoder.decode(kv[0],StandardCharsets.UTF_8))) {
                    if(result!=null)return null;
                    result=URLDecoder.decode(kv[1],StandardCharsets.UTF_8);
                }
            }
            return result!=null && result.matches("[0-9]{14}") ? result : null;
        } catch(RuntimeException e){return null;}
    }
    @Transactional(propagation=Propagation.REQUIRES_NEW,isolation=org.springframework.transaction.annotation.Isolation.READ_COMMITTED)
    public void complete(String ref,VnPayQueryResult result) {
        PaymentTransaction tx=lock(ref);
        // An IPN may have completed this transaction while the HTTP query was in flight.
        if(tx.getStatus()==PaymentTransactionStatus.SUCCESS)return;
        boolean contradictorySuccess=tx.getStatus()==PaymentTransactionStatus.FAILED
                && result.outcome()==VnPayQueryResult.Outcome.SUCCESS;
        if(!UnresolvedPayments.STATUSES.contains(tx.getStatus()) && !contradictorySuccess)return;
        if(contradictorySuccess)tx.setStatus(PaymentTransactionStatus.RECONCILING);
        if(result.outcome()==VnPayQueryResult.Outcome.UNKNOWN){
            tx.setStatus(PaymentTransactionStatus.RECONCILING);
            tx.recordReconciliation(now().plusSeconds(retrySeconds),result.code());return;
        }
        // This joins this short transaction; no network IO is performed under DB locks.
        payments.applyResult(ref,result.amount(),result.outcome()==VnPayQueryResult.Outcome.SUCCESS,result.providerTxnNo());
        tx.recordReconciliation(null,result.code());
        events.publishAfterCommit("/topic/pos",Map.of("type","PAYMENT_RECONCILED","txnRef",ref));
    }
    @Transactional(propagation=Propagation.REQUIRES_NEW,isolation=org.springframework.transaction.annotation.Isolation.READ_COMMITTED)
    public void recordApplyConflict(String ref, boolean confirmedSuccess) {
        PaymentTransaction tx=lock(ref);
        if(UnresolvedPayments.STATUSES.contains(tx.getStatus()) || confirmedSuccess && tx.getStatus()==PaymentTransactionStatus.FAILED){
            tx.setStatus(PaymentTransactionStatus.RECONCILING);
            tx.recordReconciliation(now().plusSeconds(retrySeconds),"QUERY_APPLY_CONFLICT");
        }
    }
}
