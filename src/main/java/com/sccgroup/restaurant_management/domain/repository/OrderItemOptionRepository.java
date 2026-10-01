package com.sccgroup.restaurant_management.domain.repository;

import com.sccgroup.restaurant_management.domain.entity.order.OrderItemOption;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface OrderItemOptionRepository extends JpaRepository<OrderItemOption, Long> {
    List<OrderItemOption> findByOrderItemId(Long orderItemId);
}
