package com.sccgroup.restaurant_management.domain.repository.order;

import com.sccgroup.restaurant_management.domain.entity.order.OrderCombo;
import org.springframework.data.jpa.repository.JpaRepository;

public interface OrderComboRepository extends JpaRepository<OrderCombo, Long> {
}
