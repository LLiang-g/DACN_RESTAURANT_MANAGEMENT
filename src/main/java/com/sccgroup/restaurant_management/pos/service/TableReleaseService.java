package com.sccgroup.restaurant_management.pos.service;

import com.sccgroup.restaurant_management.common.exception.ResourceNotFoundException;
import com.sccgroup.restaurant_management.common.realtime.RealtimeEventPublisher;
import com.sccgroup.restaurant_management.common.realtime.TableStatusEvent;
import com.sccgroup.restaurant_management.domain.entity.billing.Invoice;
import com.sccgroup.restaurant_management.domain.entity.billing.InvoiceStatus;
import com.sccgroup.restaurant_management.domain.entity.floor.TableStatus;
import com.sccgroup.restaurant_management.domain.entity.order.Order;
import com.sccgroup.restaurant_management.domain.entity.order.OrderItem;
import com.sccgroup.restaurant_management.domain.entity.order.OrderItemStatus;
import com.sccgroup.restaurant_management.domain.repository.billing.InvoiceRepository;
import com.sccgroup.restaurant_management.domain.repository.order.OrderItemRepository;
import com.sccgroup.restaurant_management.domain.repository.order.OrderRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

/**
 * Nơi duy nhất quyết định "bàn có nên tự động về Trống hay chưa".
 * Gọi lại ở MỌI điểm có thể là sự kiện khiến điều kiện trở thành đúng:
 * sau khi thanh toán, sau khi hủy hóa đơn, và sau khi 1 món chuyển sang
 * SERVED/REJECTED/RETURNED (vì hóa đơn có thể đã PAID từ trước việc này).
 */
@Service
public class TableReleaseService {

    private final InvoiceRepository invoiceRepository;
    private final OrderRepository orderRepository;
    private final OrderItemRepository orderItemRepository;
    private final RealtimeEventPublisher realtimeEventPublisher;

    public TableReleaseService(InvoiceRepository invoiceRepository,
                               OrderRepository orderRepository,
                               OrderItemRepository orderItemRepository,
                               RealtimeEventPublisher realtimeEventPublisher) {
        this.invoiceRepository = invoiceRepository;
        this.orderRepository = orderRepository;
        this.orderItemRepository = orderItemRepository;
        this.realtimeEventPublisher = realtimeEventPublisher;
    }

    @Transactional
    public void releaseTableIfSettled(Long invoiceId) {
        Invoice invoice = invoiceRepository.findByIdWithTable(invoiceId)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy hóa đơn với id = " + invoiceId));

        // Chỉ tự động trả bàn khi hóa đơn bị HỦY. Hóa đơn PAID luôn cần lễ tân xác nhận
        // bằng tay (freeTable) — "mọi món đã SERVED" không đồng nghĩa "khách đã rời bàn".
        if (invoice.getStatus() != InvoiceStatus.CANCELLED) {
            return;
        }

        List<Order> orders = orderRepository.findByInvoiceId(invoiceId);
        List<Long> orderIds = orders.stream().map(Order::getId).toList();
        List<OrderItem> items = orderIds.isEmpty() ? List.of()
                : orderItemRepository.findByOrderIdInWithFood(orderIds);

        boolean allResolved = items.stream().allMatch(oi ->
                oi.getStatus() == OrderItemStatus.SERVED
                        || oi.getStatus() == OrderItemStatus.REJECTED
                        || oi.getStatus() == OrderItemStatus.RETURNED);

        if (allResolved) {
            invoice.getTable().setStatus(TableStatus.AVAILABLE);
            realtimeEventPublisher.publishAfterCommit("/topic/pos",
                    new TableStatusEvent(invoice.getTable().getId(), TableStatus.AVAILABLE.name()));
        }
    }
}