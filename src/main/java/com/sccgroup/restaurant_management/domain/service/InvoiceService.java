package com.sccgroup.restaurant_management.domain.service;

import com.sccgroup.restaurant_management.domain.entity.billing.Invoice;
import com.sccgroup.restaurant_management.domain.entity.billing.InvoiceStatus;
import com.sccgroup.restaurant_management.domain.entity.floor.RestaurantTable;
import com.sccgroup.restaurant_management.domain.entity.floor.TableStatus;
import com.sccgroup.restaurant_management.domain.repository.billing.InvoiceRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.time.LocalDateTime;

@Service
public class InvoiceService {

    private final InvoiceRepository invoiceRepository;

    public InvoiceService(InvoiceRepository invoiceRepository) {
        this.invoiceRepository = invoiceRepository;
    }

    @Transactional
    public Invoice getOrCreateOpenInvoice(RestaurantTable table) {
        return invoiceRepository.findByTableAndStatus(table, InvoiceStatus.OPEN)
                .orElseGet(() -> {
                    table.setStatus(TableStatus.SERVING);
                    return invoiceRepository.save(
                            new Invoice(table, InvoiceStatus.OPEN, LocalDateTime.now()));
                });
    }
}