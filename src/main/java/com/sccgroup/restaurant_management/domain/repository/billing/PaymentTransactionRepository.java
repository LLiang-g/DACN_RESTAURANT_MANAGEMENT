package com.sccgroup.restaurant_management.domain.repository.billing;

import com.sccgroup.restaurant_management.domain.entity.billing.PaymentTransaction;
import com.sccgroup.restaurant_management.domain.entity.billing.PaymentProviderType;
import java.math.BigDecimal;
import com.sccgroup.restaurant_management.domain.entity.billing.PaymentTransactionStatus;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface PaymentTransactionRepository extends JpaRepository<PaymentTransaction, Long> {

    /** Khóa dòng giao dịch: hai webhook cùng lúc sẽ phải xếp hàng. */
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select t from PaymentTransaction t where t.txnRef = :txnRef")
    Optional<PaymentTransaction> findByTxnRefForUpdate(@Param("txnRef") String txnRef);

    Optional<PaymentTransaction> findByTxnRef(String txnRef);

    @Query("select t.invoice.id from PaymentTransaction t where t.txnRef = :txnRef")
    Optional<Long> findInvoiceIdByTxnRef(@Param("txnRef") String txnRef);

    @Query("select t.provider from PaymentTransaction t where t.txnRef = :txnRef")
    Optional<PaymentProviderType> findProviderByTxnRef(@Param("txnRef") String txnRef);

    @Query("select t.amount from PaymentTransaction t where t.txnRef = :txnRef")
    Optional<BigDecimal> findAmountByTxnRef(@Param("txnRef") String txnRef);

    List<PaymentTransaction> findByInvoiceIdAndStatus(Long invoiceId, PaymentTransactionStatus status);
    List<PaymentTransaction> findByInvoiceIdAndStatusIn(Long invoiceId, java.util.Collection<PaymentTransactionStatus> statuses);

    @Query("select t.txnRef from PaymentTransaction t where t.provider = :provider and t.status in :statuses " +
           "and (t.expiresAt <= :now or t.status = com.sccgroup.restaurant_management.domain.entity.billing.PaymentTransactionStatus.EXPIRED) " +
           "and (t.nextReconcileAt is null or t.nextReconcileAt <= :now) " +
           "order by coalesce(t.nextReconcileAt, t.createdAt), t.id")
    List<String> findDueReconciliation(@Param("provider") PaymentProviderType provider,
            @Param("statuses") java.util.Collection<PaymentTransactionStatus> statuses,
            @Param("now") java.time.LocalDateTime now, org.springframework.data.domain.Pageable pageable);
}
