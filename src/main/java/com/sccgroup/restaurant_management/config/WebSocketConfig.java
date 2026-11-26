package com.sccgroup.restaurant_management.config;

import com.sccgroup.restaurant_management.common.security.StompAccessGuard;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Configuration;
import org.springframework.messaging.simp.config.ChannelRegistration;
import org.springframework.messaging.simp.config.MessageBrokerRegistry;
import org.springframework.web.socket.config.annotation.*;

import java.util.Arrays;

@Configuration
@EnableWebSocketMessageBroker
public class WebSocketConfig implements WebSocketMessageBrokerConfigurer {
    private final StompAccessGuard guard;
    private final String[] origins;

    public WebSocketConfig(StompAccessGuard guard,
            @Value("${WS_ALLOWED_ORIGINS:http://localhost:3000,http://localhost:5173,http://localhost:5174,http://localhost:5175,http://localhost:5176,http://127.0.0.1:5173,http://127.0.0.1:5174,http://127.0.0.1:5175,http://127.0.0.1:5176,http://127.0.0.1:15173,http://127.0.0.1:15174,http://127.0.0.1:15175,http://127.0.0.1:15176}") String allowedOrigins) {
        this.guard = guard;
        origins = Arrays.stream(allowedOrigins.split(",")).map(String::trim).filter(s -> !s.isEmpty()).toArray(String[]::new);
        if (origins.length == 0 || Arrays.stream(origins).anyMatch(s -> s.contains("*"))) {
            throw new IllegalArgumentException("WS_ALLOWED_ORIGINS must contain explicit frontend origins");
        }
    }

    @Override
    public void registerStompEndpoints(StompEndpointRegistry registry) {
        registry.addEndpoint("/ws").setAllowedOrigins(origins).withSockJS();
    }

    @Override
    public void configureClientInboundChannel(ChannelRegistration registration) {
        registration.interceptors(guard);
    }

    @Override
    public void configureClientOutboundChannel(ChannelRegistration registration) {
        registration.interceptors(guard.outbound());
    }

    @Override
    public void configureMessageBroker(MessageBrokerRegistry registry) {
        registry.enableSimpleBroker("/topic");
        registry.setApplicationDestinationPrefixes("/app");
    }
}
