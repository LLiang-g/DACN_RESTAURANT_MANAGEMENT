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
 * Releases a cancelled invoice's table only when it has no open or subsequent invoice.
 * PAID invoices continue to require the receptionist's explicit freeTable action.
 * Callers must acquire the table lock before any invoice/item locks.
 */
@Service
public class TableReleaseService {

    private final com.sccgroup.restaurant_management.domain.repository.floor.RestaurantTableRepository tables;
    private final InvoiceRepository invoiceRepository;
    private final OrderRepository orderRepository;
    private final OrderItemRepository orderItemRepository;
    private final RealtimeEventPublisher realtimeEventPublisher;

    public TableReleaseService(com.sccgroup.restaurant_management.domain.repository.floor.RestaurantTableRepository tables,
                               InvoiceRepository invoiceRepository,
                               OrderRepository orderRepository,
                               OrderItemRepository orderItemRepository,
                               RealtimeEventPublisher realtimeEventPublisher) {
        this.tables = tables;
        this.invoiceRepository = invoiceRepository;
        this.orderRepository = orderRepository;
        this.orderItemRepository = orderItemRepository;
        this.realtimeEventPublisher = realtimeEventPublisher;
    }

    /** Must run before invoice/item locks in the caller. */
    @Transactional(propagation = org.springframework.transaction.annotation.Propagation.MANDATORY)
    public com.sccgroup.restaurant_management.domain.entity.floor.RestaurantTable lockTableForInvoice(Long invoiceId) {
        Long tableId = invoiceRepository.findTableIdById(invoiceId)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy hóa đơn với id = " + invoiceId));
        return tables.findByIdForUpdate(tableId)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy bàn với id = " + tableId));
    }

    @Transactional(isolation = org.springframework.transaction.annotation.Isolation.READ_COMMITTED)
    public void releaseTableIfSettled(Long invoiceId) {
        var table = lockTableForInvoice(invoiceId);
        Invoice invoice = invoiceRepository.findByIdForUpdate(invoiceId)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy hóa đơn với id = " + invoiceId));

        // Chỉ tự động trả bàn khi hóa đơn bị HỦY. Hóa đơn PAID luôn cần lễ tân xác nhận
        // bằng tay (freeTable) — "mọi món đã SERVED" không đồng nghĩa "khách đã rời bàn".
        if (invoiceRepository.findStatusById(invoiceId).orElseThrow() != InvoiceStatus.CANCELLED) {
            return;
        }

        // An older cancellation must never release a subsequent visit, even if already paid.
        if (invoiceRepository.existsByTableIdAndStatus(table.getId(), InvoiceStatus.OPEN)
                || invoiceRepository.existsByTableIdAndIdGreaterThan(table.getId(), invoiceId)) {
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
            table.setStatus(TableStatus.AVAILABLE);
            realtimeEventPublisher.publishAfterCommit("/topic/pos",
                    new TableStatusEvent(table.getId(), TableStatus.AVAILABLE.name()));
        }
    }
}