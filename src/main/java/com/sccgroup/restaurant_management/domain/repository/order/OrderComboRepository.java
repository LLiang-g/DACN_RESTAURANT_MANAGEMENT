package com.sccgroup.restaurant_management.domain.repository.order;

import com.sccgroup.restaurant_management.domain.entity.order.OrderCombo;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;

public interface OrderComboRepository extends JpaRepository<OrderCombo, Long> {

    @Query("select oc from OrderCombo oc join fetch oc.combo where oc.order.invoice.id = :invoiceId")
    List<OrderCombo> findByInvoiceId(@Param("invoiceId") Long invoiceId);
}
