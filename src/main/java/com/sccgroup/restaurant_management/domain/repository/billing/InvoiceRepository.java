package com.sccgroup.restaurant_management.domain.repository.billing;

import com.sccgroup.restaurant_management.domain.entity.billing.Invoice;
import com.sccgroup.restaurant_management.domain.entity.billing.InvoiceStatus;
import com.sccgroup.restaurant_management.domain.entity.order.OrderItemStatus;
import com.sccgroup.restaurant_management.domain.entity.floor.RestaurantTable;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
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

    Optional<Invoice> findByTableAndStatus(RestaurantTable table, InvoiceStatus status);

    @Query("""
    select i from Invoice i
    join fetch i.table t
    where i.status = com.sccgroup.restaurant_management.domain.entity.billing.InvoiceStatus.OPEN
    """)
    List<Invoice> findAllOpenWithTable();

    @Query("select i from Invoice i join fetch i.table t where i.id = :id")
    Optional<Invoice> findByIdWithTable(@Param("id") Long id);

    @Query("""
    select i from Invoice i
    join fetch i.table t
    where t.id in :tableIds
    order by i.id desc
    """)
    List<Invoice> findLatestByTableIdsOrderByIdDesc(@Param("tableIds") List<Long> tableIds);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select i from Invoice i where i.id = :id")
    Optional<Invoice> findByIdForUpdate(@Param("id") Long id);

    /** Fresh scalar status read after acquiring the invoice lock. */
    @Query("select i.status from Invoice i where i.id = :id")
    Optional<InvoiceStatus> findStatusById(@Param("id") Long id);

}
