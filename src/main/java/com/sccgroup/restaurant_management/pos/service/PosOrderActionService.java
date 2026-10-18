package com.sccgroup.restaurant_management.pos.service;

import com.sccgroup.restaurant_management.common.exception.BusinessException;
import com.sccgroup.restaurant_management.common.exception.ResourceNotFoundException;
import com.sccgroup.restaurant_management.common.realtime.KdsNewItemEvent;
import com.sccgroup.restaurant_management.common.realtime.OrderItemStatusEvent;
import com.sccgroup.restaurant_management.common.realtime.RealtimeEventPublisher;
import com.sccgroup.restaurant_management.domain.entity.order.OrderItem;
import com.sccgroup.restaurant_management.domain.entity.order.OrderItemStatus;
import com.sccgroup.restaurant_management.domain.repository.order.OrderItemRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;

@Service
public class PosOrderActionService {

    private final OrderItemRepository orderItemRepository;
    private final RealtimeEventPublisher realtimeEventPublisher;

    public PosOrderActionService(OrderItemRepository orderItemRepository,
                                 RealtimeEventPublisher realtimeEventPublisher) {
        this.orderItemRepository = orderItemRepository;
        this.realtimeEventPublisher = realtimeEventPublisher;
    }

    @Transactional
    public void approve(Long orderItemId) {
        OrderItem item = getPendingItemOrThrow(orderItemId);

        item.setStatus(OrderItemStatus.CONFIRMED);
        orderItemRepository.save(item);

        Long stationId = item.getFood().getCategory().getKitchenStation().getId();
        Long tableId = item.getOrder().getInvoice().getTable().getId();

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

    @Transactional
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
        OrderItem item = orderItemRepository.findById(orderItemId)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy món với id = " + orderItemId));

        if (item.getStatus() != OrderItemStatus.PENDING) {
            throw new BusinessException("ORDER_ITEM_ALREADY_PROCESSED", "Món này đã được xử lý trước đó");
        }
        return item;
    }


    @Transactional
    public void markServed(Long orderItemId) {
        OrderItem item = orderItemRepository.findById(orderItemId)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy món với id = " + orderItemId));

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

    @Transactional
    public void markReturned(Long orderItemId) {
        OrderItem item = orderItemRepository.findById(orderItemId)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy món với id = " + orderItemId));

        if (item.getStatus() != OrderItemStatus.SERVED) {
            throw new BusinessException("ORDER_ITEM_NOT_RETURNABLE",
                    "Chỉ có thể đánh dấu trả món khi món đã ở trạng thái SERVED");
        }

        item.setStatus(OrderItemStatus.RETURNED);
        item.setReturnedAt(LocalDateTime.now());
        orderItemRepository.save(item);

        Long tableId = item.getOrder().getInvoice().getTable().getId();
        realtimeEventPublisher.publishAfterCommit(
                "/topic/table/" + tableId,
                new OrderItemStatusEvent(item.getId(), tableId, "RETURNED", null)
        );
    }
}