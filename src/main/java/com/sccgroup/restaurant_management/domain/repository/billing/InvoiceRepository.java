package com.sccgroup.restaurant_management.domain.repository.billing;

import com.sccgroup.restaurant_management.domain.entity.billing.Invoice;
import com.sccgroup.restaurant_management.domain.entity.billing.InvoiceStatus;
import com.sccgroup.restaurant_management.domain.entity.order.OrderItemStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface InvoiceRepository extends JpaRepository<Invoice, Long> {

    /** Hóa đơn đang mở (OPEN) của một bàn, nếu có. */
    Optional<Invoice> findFirstByTableIdAndStatusOrderByOpenedAtDesc(Long tableId, InvoiceStatus status);

    /** Hóa đơn status = :status mà mọi món đều ở trạng thái :excluded (không còn Order hợp lệ). */
    @Query("select i from Invoice i where i.status = :status and not exists "
            + "(select 1 from OrderItem oi where oi.order.invoice = i and oi.status <> :excluded)")
    List<Invoice> findWithoutValidItems(@Param("status") InvoiceStatus status,
                                        @Param("excluded") OrderItemStatus excluded);
}
