package com.sccgroup.restaurant_management.admin.service;

import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Component;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;

import java.util.Map;

/**
 * Báo cho các màn hình admin biết nhật ký hoạt động / giao dịch kho vừa thay đổi
 * (qua STOMP, topic /topic/admin/activity). Màn hình nhận được thì tải lại nhật ký.
 *
 * Nếu đang trong giao dịch thì chỉ gửi SAU KHI commit, để màn hình tải lại thấy đúng dữ liệu mới.
 */
@Component
public class AdminEventPublisher {

    public static final String TOPIC = "/topic/admin/activity";

    private final SimpMessagingTemplate messagingTemplate;

    public AdminEventPublisher(SimpMessagingTemplate messagingTemplate) {
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
