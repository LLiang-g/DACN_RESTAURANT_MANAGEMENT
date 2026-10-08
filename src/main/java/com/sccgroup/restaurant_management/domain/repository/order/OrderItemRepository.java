package com.sccgroup.restaurant_management.domain.repository.order;

import com.sccgroup.restaurant_management.domain.entity.order.OrderItem;
import com.sccgroup.restaurant_management.domain.entity.order.OrderItemStatus;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Collection;
import java.util.List;
import java.util.Optional;

public interface OrderItemRepository extends JpaRepository<OrderItem, Long> {

    /** Mọi món của một hóa đơn, theo thứ tự thời gian gửi đơn. */
    @Query("select oi from OrderItem oi join fetch oi.food join fetch oi.order o where o.invoice.id = :invoiceId order by o.createdAt, oi.id")
    List<OrderItem> findByInvoiceId(@Param("invoiceId") Long invoiceId);

    /** Bàn mà món này thuộc về (không nạp entity, không khóa). */
    @Query("select oi.order.invoice.table.id from OrderItem oi where oi.id = :id")
    Optional<Long> findTableIdByItemId(@Param("id") Long id);

    /** Id các món cùng một combo trong đơn. */
    @Query("select oi.id from OrderItem oi where oi.orderCombo.id = :comboId")
    List<Long> findIdsByOrderComboId(@Param("comboId") Long comboId);

    /** Đọc + khóa dòng món (SELECT ... FOR UPDATE) để không đua với bếp bấm "Nấu". */
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select oi from OrderItem oi where oi.id in :ids")
    List<OrderItem> findAllByIdForUpdate(@Param("ids") Collection<Long> ids);

    /** Các món theo trạng thái (kèm món ăn) — dùng tính lượng nguyên liệu đang được giữ chỗ. */
    @Query("select oi from OrderItem oi join fetch oi.food where oi.status in :statuses")
    List<OrderItem> findByStatusIn(@Param("statuses") Collection<OrderItemStatus> statuses);

    /** Số món còn hiệu lực (chưa bị loại trừ theo status) của hóa đơn. */
    @Query("select count(oi) from OrderItem oi where oi.order.invoice.id = :invoiceId and oi.status not in :excluded")
    long countByInvoiceIdAndStatusNotIn(@Param("invoiceId") Long invoiceId,
                                        @Param("excluded") Collection<OrderItemStatus> excluded);
}
