package com.sccgroup.restaurant_management.config;

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
}