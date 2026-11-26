package com.sccgroup.restaurant_management.common.realtime;

import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Component;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;

@Component
public class RealtimeEventPublisher {

    private final SimpMessagingTemplate messagingTemplate;

    public RealtimeEventPublisher(SimpMessagingTemplate messagingTemplate) {
        this.messagingTemplate = messagingTemplate;
    }

    /**
     * Gửi sự kiện tới 1 topic STOMP, nhưng CHỈ gửi sau khi transaction hiện tại
     * commit thành công. Nếu không đang ở trong transaction (ví dụ gọi từ test
     * không có @Transactional), gửi ngay lập tức.
     */
    public void publishAfterCommit(String topic, Object payload) {
        if (TransactionSynchronizationManager.isSynchronizationActive()) {
            TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization() {
                @Override
                public void afterCommit() {
                    messagingTemplate.convertAndSend(topic, payload);
                }
            });
        } else {
            messagingTemplate.convertAndSend(topic, payload);
        }
    }
}