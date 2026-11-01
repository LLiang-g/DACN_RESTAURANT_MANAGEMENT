package com.sccgroup.restaurant_management.domain.repository.billing;

import com.sccgroup.restaurant_management.domain.entity.billing.PaymentTransaction;
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

    List<PaymentTransaction> findByInvoiceIdAndStatus(Long invoiceId, PaymentTransactionStatus status);
}