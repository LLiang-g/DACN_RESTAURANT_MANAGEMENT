package com.sccgroup.restaurant_management.domain.service;

import com.sccgroup.restaurant_management.domain.entity.billing.Invoice;
import com.sccgroup.restaurant_management.domain.entity.billing.InvoiceStatus;
import com.sccgroup.restaurant_management.domain.entity.floor.RestaurantTable;
import com.sccgroup.restaurant_management.domain.repository.InvoiceRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.time.LocalDateTime;

@Service
public class InvoiceService {

    private final InvoiceRepository invoiceRepository;

    public InvoiceService(InvoiceRepository invoiceRepository) {
        this.invoiceRepository = invoiceRepository;
    }

    /**
     * Không có API "open invoice" riêng — hàm này là NƠI DUY NHẤT tạo Invoice mới.
     * Gọi khi khách gửi Order: có hóa đơn OPEN cho bàn thì dùng lại (gộp),
     * chưa có thì tự tạo mới.
     */
    @Transactional
    public Invoice getOrCreateOpenInvoice(RestaurantTable table) {
        return invoiceRepository.findByTableAndStatus(table, InvoiceStatus.OPEN)
                .orElseGet(() -> invoiceRepository.save(
                        new Invoice(table, InvoiceStatus.OPEN, LocalDateTime.now())));
    }
}