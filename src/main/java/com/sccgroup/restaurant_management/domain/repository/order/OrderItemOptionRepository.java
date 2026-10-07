package com.sccgroup.restaurant_management.domain.repository.order;

import com.sccgroup.restaurant_management.domain.entity.order.OrderItemOption;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Collection;
import java.util.List;

public interface OrderItemOptionRepository extends JpaRepository<OrderItemOption, Long> {

    @EntityGraph(attributePaths = {"option", "option.ingredient"})
    List<OrderItemOption> findByOrderItemIdIn(Collection<Long> orderItemIds);
}
