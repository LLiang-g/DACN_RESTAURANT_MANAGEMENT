package com.sccgroup.restaurant_management.domain.service;

import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Component;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;

import java.util.Map;

/**
 * Đẩy sự kiện realtime qua STOMP. Chỉ gửi "có thay đổi", client nhận được thì tự tải lại dữ liệu.
 * - /topic/table/{tableId}: màn hình khách của bàn đó (trạng thái món, hóa đơn).
 * - /topic/pos: màn hình lễ tân (đơn mới, khách hủy đơn, khách gọi nhân viên).
 * Đang trong giao dịch thì chỉ gửi SAU KHI commit để người nhận tải lại thấy đúng dữ liệu mới.
 */
@Component
public class TableEventPublisher {

    public static final String POS_TOPIC = "/topic/pos";
    public static final String TABLE_TOPIC_PREFIX = "/topic/table/";

    public static final String EVENT_ORDER_PLACED = "ORDER_PLACED";
    public static final String EVENT_ORDER_CANCELLED_BY_CUSTOMER = "ORDER_CANCELLED_BY_CUSTOMER";
    public static final String EVENT_CALL_STAFF = "CALL_STAFF";
    public static final String EVENT_CHANGED = "CHANGED";

    private final SimpMessagingTemplate messagingTemplate;

    public TableEventPublisher(SimpMessagingTemplate messagingTemplate) {
        this.messagingTemplate = messagingTemplate;
    }

    /** Báo màn hình khách của bàn: dữ liệu bàn vừa thay đổi. */
    public void publishTableChanged(Long tableId) {
        sendAfterCommit(TABLE_TOPIC_PREFIX + tableId, Map.of("type", EVENT_CHANGED, "tableId", tableId));
    }

    /** Báo lễ tân: có sự kiện từ khách (eventType là một trong các hằng EVENT_*). */
    public void publishPosEvent(String eventType, Long tableId) {
        sendAfterCommit(POS_TOPIC, Map.of("type", eventType, "tableId", tableId));
    }

    private void sendAfterCommit(String destination, Map<String, Object> payload) {
        if (TransactionSynchronizationManager.isSynchronizationActive()) {
            TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization() {
                @Override
                public void afterCommit() {
                    messagingTemplate.convertAndSend(destination, payload);
                }
            });
        } else {
            messagingTemplate.convertAndSend(destination, payload);
        }
    }
}
