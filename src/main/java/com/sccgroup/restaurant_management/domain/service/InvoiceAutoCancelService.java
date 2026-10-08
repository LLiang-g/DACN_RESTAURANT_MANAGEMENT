package com.sccgroup.restaurant_management.domain.service;

import com.sccgroup.restaurant_management.domain.entity.billing.Invoice;
import com.sccgroup.restaurant_management.domain.entity.billing.InvoiceStatus;
import com.sccgroup.restaurant_management.domain.entity.floor.RestaurantTable;
import com.sccgroup.restaurant_management.domain.entity.floor.TableStatus;
import com.sccgroup.restaurant_management.domain.entity.order.OrderItemStatus;
import com.sccgroup.restaurant_management.domain.repository.billing.InvoiceRepository;
import com.sccgroup.restaurant_management.domain.repository.floor.RestaurantTableRepository;
import com.sccgroup.restaurant_management.domain.repository.order.OrderItemRepository;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.concurrent.ConcurrentHashMap;
import java.util.stream.Collectors;

/**
 * Quy tắc hóa đơn rỗng: khi mọi Order của hóa đơn đều bị hủy/từ chối (REJECTED) thì hóa đơn KHÔNG đóng ngay,
 * bàn vẫn "đang phục vụ". Nếu sau một khoảng chờ (cấu hình được) vẫn không có Order hợp lệ mới, hóa đơn chuyển
 * CANCELLED và bàn về AVAILABLE.
 *
 * Quét định kỳ theo trạng thái món nên áp dụng cho cả hủy của khách lẫn từ chối của lễ tân, không cần hook.
 * Thời điểm "bắt đầu rỗng" lưu trong RAM (schema không có cột này): khởi động lại ứng dụng thì khoảng chờ tính lại.
 *
 * Cấu hình: app.invoice.empty-grace-minutes (mặc định 10), app.invoice.scan-interval-ms (mặc định 30000).
 */
@Service
public class InvoiceAutoCancelService {

    private final InvoiceRepository invoiceRepository;
    private final RestaurantTableRepository tableRepository;
    private final OrderItemRepository orderItemRepository;
    private final long graceMinutes;
    private final Map<Long, LocalDateTime> emptySince = new ConcurrentHashMap<>();

    public InvoiceAutoCancelService(InvoiceRepository invoiceRepository,
                                    RestaurantTableRepository tableRepository,
                                    OrderItemRepository orderItemRepository,
                                    @Value("${app.invoice.empty-grace-minutes:10}") long graceMinutes) {
        this.invoiceRepository = invoiceRepository;
        this.tableRepository = tableRepository;
        this.orderItemRepository = orderItemRepository;
        this.graceMinutes = graceMinutes;
    }

    @Scheduled(fixedDelayString = "${app.invoice.scan-interval-ms:30000}")
    @Transactional
    public void scan() {
        cancelExpired(LocalDateTime.now());
    }

    /** Tách riêng tham số "bây giờ" để dễ kiểm thử. Trả về số hóa đơn đã hủy. */
    int cancelExpired(LocalDateTime now) {
        List<Invoice> empty = invoiceRepository.findWithoutValidItems(InvoiceStatus.OPEN, OrderItemStatus.REJECTED);
        Set<Long> emptyIds = empty.stream().map(Invoice::getId).collect(Collectors.toSet());
        emptySince.keySet().retainAll(emptyIds); // đã có Order hợp lệ mới -> hết đếm giờ

        int cancelled = 0;
        for (Invoice invoice : empty) {
            LocalDateTime since = emptySince.computeIfAbsent(invoice.getId(), invoiceId -> now);
            if (since.plusMinutes(graceMinutes).isAfter(now)) continue;

            // Khóa bàn rồi kiểm tra lại: khách có thể vừa gửi đơn mới ngay lúc hết hạn
            RestaurantTable table = tableRepository.findByIdForUpdate(invoice.getTable().getId()).orElse(null);
            if (table == null) continue;
            if (orderItemRepository.countByInvoiceIdAndStatusNotIn(invoice.getId(), Set.of(OrderItemStatus.REJECTED)) > 0) {
                continue;
            }
            invoice.setStatus(InvoiceStatus.CANCELLED);
            invoice.setCancelledAt(now);
            table.setStatus(TableStatus.AVAILABLE);
            emptySince.remove(invoice.getId());
            cancelled++;
        }
        return cancelled;
    }
}
