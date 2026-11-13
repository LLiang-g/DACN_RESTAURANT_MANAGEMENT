package com.sccgroup.restaurant_management.pos.service;

import com.sccgroup.restaurant_management.common.exception.BusinessException;
import com.sccgroup.restaurant_management.common.exception.ResourceNotFoundException;
import com.sccgroup.restaurant_management.common.realtime.KdsNewItemEvent;
import com.sccgroup.restaurant_management.common.realtime.OrderItemStatusEvent;
import com.sccgroup.restaurant_management.common.realtime.RealtimeEventPublisher;
import com.sccgroup.restaurant_management.domain.entity.order.OrderItem;
import com.sccgroup.restaurant_management.domain.entity.order.OrderItemStatus;
import com.sccgroup.restaurant_management.domain.repository.order.OrderItemRepository;
import com.sccgroup.restaurant_management.payment.service.InvoiceMutationGuard;
import org.springframework.transaction.annotation.Isolation;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import com.sccgroup.restaurant_management.common.exception.ConflictException;
import com.sccgroup.restaurant_management.domain.entity.billing.Invoice;
import com.sccgroup.restaurant_management.domain.entity.billing.InvoiceStatus;
import com.sccgroup.restaurant_management.domain.repository.billing.InvoiceRepository;
import java.time.LocalDateTime;

@Service
public class PosOrderActionService {

    private final OrderItemRepository orderItemRepository;
    private final RealtimeEventPublisher realtimeEventPublisher;
    private final InvoiceRepository invoiceRepository;
    private final InvoiceMutationGuard invoiceMutationGuard;

    public PosOrderActionService(OrderItemRepository orderItemRepository,
                                 RealtimeEventPublisher realtimeEventPublisher,
                                 InvoiceRepository invoiceRepository,
                                 InvoiceMutationGuard invoiceMutationGuard) {
        this.orderItemRepository = orderItemRepository;
        this.realtimeEventPublisher = realtimeEventPublisher;
        this.invoiceRepository = invoiceRepository;
        this.invoiceMutationGuard = invoiceMutationGuard;
    }

    @Transactional(isolation = Isolation.READ_COMMITTED)
    public void approve(Long orderItemId) {
        OrderItem item = getPendingItemOrThrow(orderItemId);

        item.setStatus(OrderItemStatus.CONFIRMED);
        orderItemRepository.save(item);

        Long stationId = item.getFood().getCategory().getKitchenStation().getId();
        Long tableId = item.getOrder().getInvoice().getTable().getId();

        realtimeEventPublisher.publishAfterCommit(
                "/topic/kds", java.util.Map.of("type", "CHANGED")
        );
        
        // đang dư cái này hiện đã được bổ sung cái trên
        realtimeEventPublisher.publishAfterCommit(
                "/topic/kds/" + stationId,
                new KdsNewItemEvent(item.getId(), stationId, item.getFood().getName(),
                        item.getQuantity(), item.getNote())
        );
        
        realtimeEventPublisher.publishAfterCommit(
                "/topic/table/" + tableId,
                new OrderItemStatusEvent(item.getId(), tableId, "CONFIRMED", null)
        );
    }

    @Transactional(isolation = Isolation.READ_COMMITTED)
    public void reject(Long orderItemId, String reason) {
        if (reason == null || reason.isBlank()) {
            throw new BusinessException("REJECT_REASON_REQUIRED", "Phải nhập lý do khi từ chối món");
        }

        OrderItem item = getPendingItemOrThrow(orderItemId);

        item.setStatus(OrderItemStatus.REJECTED);
        item.setNote(reason); // ghi đè note gốc bằng lý do từ chối — món REJECTED không xuống bếp nên note gốc hết tác dụng
        orderItemRepository.save(item);

        Long tableId = item.getOrder().getInvoice().getTable().getId();

        realtimeEventPublisher.publishAfterCommit(
                "/topic/table/" + tableId,
                new OrderItemStatusEvent(item.getId(), tableId, "REJECTED", reason)
        );

    }



    private OrderItem getPendingItemOrThrow(Long orderItemId) {
        OrderItem item = lockMutableItem(orderItemId);

        if (item.getStatus() != OrderItemStatus.PENDING) {
            throw new BusinessException("ORDER_ITEM_ALREADY_PROCESSED", "Món này đã được xử lý trước đó");
        }
        return item;
    }

    /**
     * Khóa dòng hóa đơn của món rồi bắt buộc hóa đơn còn OPEN.
     * Trả món / hoàn tác làm đổi tổng tiền, nên không được chạy xen kẽ với việc thanh toán.
     */
    private OrderItem lockMutableItem(Long orderItemId) {
        Long invoiceId = orderItemRepository.findInvoiceIdByItemId(orderItemId)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy món với id = " + orderItemId));
        invoiceMutationGuard.lockForMutation(invoiceId);
        return lockItem(orderItemId);
    }

    private OrderItem lockItem(Long orderItemId) {
        return orderItemRepository.findAllByIdForUpdate(java.util.List.of(orderItemId)).stream().findFirst()
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy món với id = " + orderItemId));
    }


    @Transactional(isolation = Isolation.READ_COMMITTED)
    public void markServed(Long orderItemId) {
        OrderItem item = lockItem(orderItemId);

        if (item.getStatus() != OrderItemStatus.DONE) {
            throw new BusinessException("ORDER_ITEM_NOT_SERVABLE",
                    "Chỉ có thể xác nhận phục vụ món đang ở trạng thái DONE");
        }

        item.setStatus(OrderItemStatus.SERVED);
        item.setServedAt(LocalDateTime.now());
        orderItemRepository.save(item);

        Long tableId = item.getOrder().getInvoice().getTable().getId();
        realtimeEventPublisher.publishAfterCommit(
                "/topic/table/" + tableId,
                new OrderItemStatusEvent(item.getId(), tableId, "SERVED", null)
        );

    }

    @Transactional(isolation = Isolation.READ_COMMITTED)
    public void undoReturn(Long orderItemId) {
        OrderItem item = lockMutableItem(orderItemId);

        if (item.getStatus() != OrderItemStatus.RETURNED) {
            throw new BusinessException("ORDER_ITEM_NOT_UNDOABLE",
                    "Chỉ có thể hoàn tác món đang ở trạng thái RETURNED");
        }

        item.setStatus(OrderItemStatus.SERVED);
        item.setReturnedAt(null);
        item.setNote(null); // Xóa lý do trả món khi hoàn tác
        orderItemRepository.save(item);

        Long tableId = item.getOrder().getInvoice().getTable().getId();
        realtimeEventPublisher.publishAfterCommit("/topic/table/" + tableId,
                new OrderItemStatusEvent(item.getId(), tableId, "SERVED", null));
    }

    @Transactional(isolation = Isolation.READ_COMMITTED)
    public void markReturned(Long orderItemId, String reason) {
        if (reason == null || reason.isBlank()) {
            throw new BusinessException("RETURN_REASON_REQUIRED", "Phải nhập lý do khi trả món");
        }

        OrderItem item = lockMutableItem(orderItemId);

        if (item.getStatus() != OrderItemStatus.SERVED) {
            throw new BusinessException("ORDER_ITEM_NOT_RETURNABLE",
                    "Chỉ có thể đánh dấu trả món khi món đã ở trạng thái SERVED");
        }

        item.setStatus(OrderItemStatus.RETURNED);
        item.setReturnedAt(LocalDateTime.now());
        item.setNote(reason.trim()); // Lưu lý do trả món vào note
        orderItemRepository.save(item);

        Long tableId = item.getOrder().getInvoice().getTable().getId();
        realtimeEventPublisher.publishAfterCommit(
                "/topic/table/" + tableId,
                new OrderItemStatusEvent(item.getId(), tableId, "RETURNED", reason.trim())
        );
    }

}