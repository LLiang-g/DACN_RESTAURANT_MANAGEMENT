package com.sccgroup.restaurant_management.domain.repository;

import com.sccgroup.restaurant_management.domain.entity.billing.Invoice;
import com.sccgroup.restaurant_management.domain.entity.billing.InvoiceStatus;
import com.sccgroup.restaurant_management.domain.entity.floor.RestaurantTable;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.Optional;


public interface InvoiceRepository extends JpaRepository<Invoice, Long> {
    Optional<Invoice> findByTableAndStatus(RestaurantTable table, InvoiceStatus status);
}
