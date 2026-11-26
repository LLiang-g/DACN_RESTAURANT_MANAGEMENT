package com.sccgroup.restaurant_management.payment.service;
import com.sccgroup.restaurant_management.domain.entity.billing.PaymentProviderType;
import com.sccgroup.restaurant_management.domain.repository.billing.PaymentTransactionRepository;
import org.springframework.boot.autoconfigure.condition.ConditionalOnExpression;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.data.domain.PageRequest;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import java.time.*;
@Component
@ConditionalOnProperty(name="vnpay.enabled",havingValue="true")
@ConditionalOnExpression("${PAYMENT_RECONCILE_ENABLED:true}")
public class PaymentReconciliationJob {
    private static final Logger log=LoggerFactory.getLogger(PaymentReconciliationJob.class);
    private final PaymentTransactionRepository transactions;
    private final PaymentReconciliationService service;
    public PaymentReconciliationJob(PaymentTransactionRepository transactions,PaymentReconciliationService service){this.transactions=transactions;this.service=service;}
    @Scheduled(fixedDelayString="${PAYMENT_RECONCILE_SCAN_MS:15000}",scheduler="paymentReconciliationScheduler")
    public void scan(){
        var due=transactions.findDueReconciliation(PaymentProviderType.VNPAY,UnresolvedPayments.STATUSES,
                LocalDateTime.now(ZoneId.of("Asia/Ho_Chi_Minh")),PageRequest.of(0,10));
        for(String ref:due)try{service.reconcile(ref);}catch(RuntimeException e){log.warn("Cannot reconcile payment transaction={}",ref);}
    }
}
