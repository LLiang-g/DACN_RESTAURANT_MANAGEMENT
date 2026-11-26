package com.sccgroup.restaurant_management.config;

import com.sccgroup.restaurant_management.common.exception.ResourceNotFoundException;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.web.bind.annotation.*;

@RestController
public class WebSocketTestController {

    private final SimpMessagingTemplate messagingTemplate;

    public WebSocketTestController(SimpMessagingTemplate messagingTemplate) {
        this.messagingTemplate = messagingTemplate;
    }

    @PostMapping("/api/test/broadcast")
    public void broadcast(@RequestParam String message) {
        messagingTemplate.convertAndSend("/topic/test", message);
    }

    @GetMapping("/api/test/error")
    public void testError() {
        throw new ResourceNotFoundException("Không tìm thấy bàn với ID 999");
    }
}