package com.sccgroup.restaurant_management.payment.service;
import com.sccgroup.restaurant_management.payment.dto.PaymentResponse;
import com.sccgroup.restaurant_management.payment.provider.VnPayQueryClient;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
@Service
@ConditionalOnProperty(name="vnpay.enabled",havingValue="true")
public class PaymentReconciliationService {
    private static final Logger log=LoggerFactory.getLogger(PaymentReconciliationService.class);
    private final PaymentReconciliationStore store;
    private final VnPayQueryClient client;
    private final PaymentService payments;
    public PaymentReconciliationService(PaymentReconciliationStore store,VnPayQueryClient client,PaymentService payments){
        this.store=store;this.client=client;this.payments=payments;
    }
    @Transactional(propagation=Propagation.NOT_SUPPORTED)
    public PaymentResponse reconcile(String ref){
        var snapshot=store.claim(ref);
        if(snapshot!=null){
            var result=client.query(snapshot.txnRef(),snapshot.amount(),snapshot.transactionDate());
            try {store.complete(ref,result);}
            catch(RuntimeException e){
                log.warn("Payment query result requires manual reconciliation; transaction={}",ref);
                store.recordApplyConflict(ref,result.outcome()==com.sccgroup.restaurant_management.payment.provider.VnPayQueryResult.Outcome.SUCCESS);
            }
        }
        return payments.get(ref);
    }
}
