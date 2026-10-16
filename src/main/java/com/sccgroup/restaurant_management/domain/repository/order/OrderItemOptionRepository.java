package com.sccgroup.restaurant_management.domain.repository.order;

import com.sccgroup.restaurant_management.domain.entity.order.OrderItem;
import com.sccgroup.restaurant_management.domain.entity.order.OrderItemOption;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Collection;
import java.util.List;

public interface OrderItemOptionRepository extends JpaRepository<OrderItemOption, Long> {

    @EntityGraph(attributePaths = {"option", "option.ingredient"})
    List<OrderItemOption> findByOrderItemIdIn(Collection<Long> orderItemIds);


    @Query("""
    select oio from OrderItemOption oio
    join fetch oio.option o
    where oio.orderItem.id in :orderItemIds
    """)
    List<OrderItemOption> findByOrderItemIdInWithOption(@Param("orderItemIds") List<Long> orderItemIds);
}
