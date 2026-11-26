package com.sccgroup.restaurant_management.kds.service;

import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Component;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;

import java.util.Map;

/**
 * Báo cho mọi màn hình bếp biết dữ liệu vừa thay đổi (qua STOMP, topic /topic/kds).
 * Màn hình nhận được thì tải lại danh sách order.
 *
 * Module khác (vd. pos khi lễ tân duyệt/từ chối món) cũng gọi publishChanged() sau khi lưu.
 * Nếu đang trong giao dịch thì chỉ gửi SAU KHI commit, để bếp tải lại thấy đúng dữ liệu mới.
 */
@Component
public class KdsEventPublisher {

    public static final String TOPIC = "/topic/kds";

    private final SimpMessagingTemplate messagingTemplate;

    public KdsEventPublisher(SimpMessagingTemplate messagingTemplate) {
        this.messagingTemplate = messagingTemplate;
    }

    public void publishChanged() {
        if (TransactionSynchronizationManager.isSynchronizationActive()) {
            TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization() {
                @Override
                public void afterCommit() {
                    send();
                }
            });
        } else {
            send();
        }
    }

    private void send() {
        messagingTemplate.convertAndSend(TOPIC, Map.of("type", "CHANGED"));
    }
}
