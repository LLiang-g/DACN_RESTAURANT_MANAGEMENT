package com.sccgroup.restaurant_management.domain.controller;

import com.sccgroup.restaurant_management.common.exception.ResourceNotFoundException;
import com.sccgroup.restaurant_management.domain.entity.billing.Invoice;
import com.sccgroup.restaurant_management.domain.entity.floor.RestaurantTable;
import com.sccgroup.restaurant_management.domain.repository.floor.RestaurantTableRepository;
import com.sccgroup.restaurant_management.domain.service.InvoiceService;
import org.springframework.web.bind.annotation.*;
import java.time.LocalDateTime;

record InvoiceDto(Long id, Long tableId, String status, LocalDateTime openedAt) {}

@RestController
@RequestMapping("/api/test")
public class InvoiceTestController {

    private final InvoiceService invoiceService;
    private final RestaurantTableRepository tableRepository;

    public InvoiceTestController(InvoiceService invoiceService, RestaurantTableRepository tableRepository) {
        this.invoiceService = invoiceService;
        this.tableRepository = tableRepository;
    }

    @PostMapping("/invoice")
    public InvoiceDto testGetOrCreateInvoice(@RequestParam Long tableId) {
        RestaurantTable table = tableRepository.findById(tableId)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy bàn với ID " + tableId));

        Invoice invoice = invoiceService.getOrCreateOpenInvoice(table);

        return new InvoiceDto(invoice.getId(), table.getId(),
                invoice.getStatus().name(), invoice.getOpenedAt());
    }
}