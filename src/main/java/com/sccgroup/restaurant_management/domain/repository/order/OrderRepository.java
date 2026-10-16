package com.sccgroup.restaurant_management.domain.repository.order;

import com.sccgroup.restaurant_management.domain.entity.order.Order;
import com.sccgroup.restaurant_management.domain.entity.order.OrderItemStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;

public interface OrderRepository extends JpaRepository<Order, Long> {

    @Query("""
        select distinct o from Order o
        join fetch o.invoice i
        join fetch i.table t
        where exists (
            select 1 from OrderItem oi
            where oi.order = o and oi.status = :status
        )
        order by o.createdAt asc
        """)
    List<Order> findOrdersContainingItemStatus(@Param("status") OrderItemStatus status);
}