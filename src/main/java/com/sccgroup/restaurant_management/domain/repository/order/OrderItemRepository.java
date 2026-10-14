package com.sccgroup.restaurant_management.domain.repository.order;

import com.sccgroup.restaurant_management.domain.entity.menu.Option;
import com.sccgroup.restaurant_management.domain.entity.order.OrderItem;
import com.sccgroup.restaurant_management.domain.entity.order.OrderItemStatus;
import jakarta.persistence.LockModeType;
import org.springframework.data.domain.Pageable;
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

    // ===================== Dành cho KDS (module kds) =====================

    /**
     * Các món hiện lên màn hình bếp, kèm mọi thứ cần hiển thị (món -> danh mục -> khu bếp,
     * order -> hóa đơn -> bàn, combo) trong MỘT câu truy vấn để tránh N+1.
     * Sắp theo thời điểm gửi đơn cũ nhất trước.
     */
    @Query("select oi from OrderItem oi " +
           "join fetch oi.food f join fetch f.category c join fetch c.kitchenStation " +
           "join fetch oi.order o join fetch o.invoice i join fetch i.table " +
           "left join fetch oi.orderCombo oc left join fetch oc.combo " +
           "where oi.status in :statuses order by o.createdAt, oi.id")
    List<OrderItem> findForKds(@Param("statuses") Collection<OrderItemStatus> statuses);

    /** Tên các option khách đã chọn cho nhiều món một lượt: mỗi dòng là [orderItemId, tên option]. */
    @Query("select oio.orderItem.id, oio.option.name from OrderItemOption oio " +
           "where oio.orderItem.id in :ids order by oio.id")
    List<Object[]> findOptionNamesByItemIds(@Param("ids") Collection<Long> ids);

    /** Các option (entity) của một món, dùng khi tính nguyên liệu để trừ kho. */
    @Query("select oio.option from OrderItemOption oio where oio.orderItem.id = :id")
    List<Option> findOptionsByItemId(@Param("id") Long id);

    /** Id order của một món (không khóa). */
    @Query("select oi.order.id from OrderItem oi where oi.id = :id")
    Optional<Long> findOrderIdByItemId(@Param("id") Long id);

    /**
     * Mọi món thuộc một khu bếp trong một order, khóa dòng theo thứ tự id.
     * Hai người cùng khu bấm Xong cùng lúc sẽ xếp hàng nhờ khóa này, và luôn khóa theo cùng thứ tự nên không khóa chéo.
     * Dùng truy vấn con thay vì join để chỉ khóa các dòng order_item (không khóa món ăn/danh mục).
     */
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select oi from OrderItem oi where oi.order.id = :orderId and oi.food.id in " +
           "(select f.id from Food f where f.category.kitchenStation.id = :stationId) order by oi.id")
    List<OrderItem> findByOrderIdAndStationIdForUpdate(@Param("orderId") Long orderId,
                                                       @Param("stationId") Long stationId);

    /**
     * Id các order còn món ở trạng thái đã cho thuộc khu bếp, order cũ nhất trước.
     * Truyền PageRequest.of(0, 1) để chỉ lấy order cũ nhất. Order không có món nào của khu bếp thì không xuất hiện ở đây.
     */
    @Query("select o.id from OrderItem oi join oi.order o join oi.food f join f.category c " +
           "where oi.status = :status and c.kitchenStation.id = :stationId order by o.createdAt, o.id")
    List<Long> findOrderIdsWithStatusForStation(@Param("status") OrderItemStatus status,
                                                @Param("stationId") Long stationId,
                                                Pageable pageable);
}
