package com.sccgroup.restaurant_management.domain.repository.billing;

import com.sccgroup.restaurant_management.domain.entity.billing.Invoice;
import com.sccgroup.restaurant_management.domain.entity.billing.InvoiceStatus;
import com.sccgroup.restaurant_management.domain.entity.floor.RestaurantTable;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface InvoiceRepository extends JpaRepository<Invoice, Long> {

    /** Hóa đơn đang mở (OPEN) của một bàn, nếu có. */


    Optional<Invoice> findByTableAndStatus(RestaurantTable table, InvoiceStatus status);
}
