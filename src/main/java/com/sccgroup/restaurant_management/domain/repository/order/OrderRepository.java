package com.sccgroup.restaurant_management.domain.repository.order;

import com.sccgroup.restaurant_management.domain.entity.order.Order;
import org.springframework.data.jpa.repository.JpaRepository;

public interface OrderRepository extends JpaRepository<Order, Long> {
}
