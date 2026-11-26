package com.sccgroup.restaurant_management.common.security;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.messaging.Message;
import org.springframework.messaging.simp.SimpMessageHeaderAccessor;
import org.springframework.messaging.simp.SimpMessageType;
import org.springframework.messaging.simp.stomp.StompCommand;
import org.springframework.messaging.simp.stomp.StompHeaderAccessor;
import org.springframework.messaging.support.MessageBuilder;
import org.springframework.messaging.support.MessageHeaderAccessor;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.test.util.ReflectionTestUtils;

import java.time.*;
import java.util.Map;
import java.util.concurrent.atomic.AtomicLong;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

class StompAccessGuardTest {
    private JwtUtil jwt;
    private CustomUserDetailsService users;
    private StompAccessGuard guard;
    private final AtomicLong now = new AtomicLong(System.currentTimeMillis());

    @BeforeEach void setup() {
        now.set(System.currentTimeMillis());
        jwt = new JwtUtil();
        ReflectionTestUtils.setField(jwt, "secret", java.util.Base64.getEncoder().encodeToString(new byte[32]));
        users = mock(CustomUserDetailsService.class);
        Clock clock = new Clock() {
            public ZoneId getZone() { return ZoneOffset.UTC; }
            public Clock withZone(ZoneId zone) { return this; }
            public Instant instant() { return Instant.ofEpochMilli(now.get()); }
        };
        guard = new StompAccessGuard(jwt, users, clock);
    }

    private Message<?> frame(StompCommand command, String session, String destination, String bearer) {
        var a = StompHeaderAccessor.create(command);
        a.setSessionId(session);
        if (destination != null) a.setDestination(destination);
        if (bearer != null) a.setNativeHeader("Authorization", bearer);
        a.setLeaveMutable(true);
        return MessageBuilder.createMessage(new byte[0], a.getMessageHeaders());
    }

    private Message<?> connect(String session, String role) {
        when(users.loadUserByUsername(session)).thenReturn(new AppUserPrincipal(1L, session, "hash", "STAFF", role));
        var m = frame(StompCommand.CONNECT, session, null, "Bearer " + jwt.generateToken(session, Map.of()));
        return guard.preSend(m, null);
    }

    private Message<?> subscribe(String session, String topic) {
        return guard.preSend(frame(StompCommand.SUBSCRIBE, session, topic, null), null);
    }

    private Message<?> delivery(String session, String topic) {
        var h = SimpMessageHeaderAccessor.create(SimpMessageType.MESSAGE);
        h.setSessionId(session); h.setDestination(topic);
        return MessageBuilder.createMessage(new byte[0], h.getMessageHeaders());
    }

    @Test void anonymousCanOnlySubscribeToExactTableTopic() {
        guard.preSend(frame(StompCommand.CONNECT, "guest", null, null), null);
        assertNotNull(subscribe("guest", "/topic/table/12"));
        for (String topic : new String[]{"/topic/pos", "/topic/kds", "/topic/admin/activity", "/topic/table/*", "/topic/**", "/topic/table/0", "/topic/test", "/user/queue/test"}) {
            assertThrows(AccessDeniedException.class, () -> subscribe("guest", topic), topic);
        }
        assertThrows(AccessDeniedException.class, () -> subscribe("unknown", "/topic/table/12"));
    }

    @Test void authorizationUsesCurrentAccountRoleRatherThanJwtRoleClaim() {
        when(users.loadUserByUsername("staff")).thenReturn(new AppUserPrincipal(1L, "staff", "hash", "STAFF", "RECEPTIONIST"));
        var m = guard.preSend(frame(StompCommand.CONNECT, "staff", null,
                "Bearer " + jwt.generateToken("staff", Map.of("role", "ADMIN"))), null);
        assertNotNull(MessageHeaderAccessor.getAccessor(m, StompHeaderAccessor.class).getUser());
        assertNotNull(subscribe("staff", "/topic/pos"));
        assertThrows(AccessDeniedException.class, () -> subscribe("staff", "/topic/admin/activity"));
        assertThrows(AccessDeniedException.class, () -> subscribe("staff", "/topic/kds"));
    }

    @Test void adminAndKitchenHaveExplicitChannels() {
        connect("admin", "ADMIN"); connect("kitchen", "KITCHEN");
        for (String topic : new String[]{"/topic/pos", "/topic/kds", "/topic/admin/activity"}) assertNotNull(subscribe("admin", topic));
        assertNotNull(subscribe("kitchen", "/topic/kds"));
        assertThrows(AccessDeniedException.class, () -> subscribe("kitchen", "/topic/pos"));
        assertThrows(AccessDeniedException.class, () -> subscribe("kitchen", "/topic/admin/activity"));
    }

    @Test void malformedExpiredAndDeletedAccountCannotAuthenticate() {
        assertThrows(AccessDeniedException.class, () -> guard.preSend(frame(StompCommand.CONNECT,"bad",null,"Bearer invalid"),null));
        String expired = io.jsonwebtoken.Jwts.builder().subject("old").expiration(new java.util.Date(1000))
                .signWith(io.jsonwebtoken.security.Keys.hmacShaKeyFor(new byte[32])).compact();
        assertThrows(AccessDeniedException.class, () -> guard.preSend(frame(StompCommand.CONNECT,"old",null,"Bearer " + expired),null));
        when(users.loadUserByUsername("deleted")).thenThrow(new org.springframework.security.core.userdetails.UsernameNotFoundException("deleted"));
        assertThrows(AccessDeniedException.class, () -> guard.preSend(frame(StompCommand.CONNECT,"deleted-session",null,
                "Bearer " + jwt.generateToken("deleted", Map.of())),null));
    }

    @Test void clientCannotForgeEventsEvenAsAdmin() {
        connect("admin", "ADMIN");
        for (String topic : new String[]{"/topic/pos", "/app/test", "/topic/table/12"}) {
            assertThrows(AccessDeniedException.class, () -> guard.preSend(frame(StompCommand.SEND,"admin",topic,null),null));
        }
    }

    @Test void idleSubscriptionStopsReceivingAfterExpiryAndDisconnect() {
        connect("staff", "RECEPTIONIST");
        assertNotNull(guard.outbound().preSend(delivery("staff", "/topic/pos"), null));
        assertNull(guard.outbound().preSend(delivery("staff", "/topic/admin/activity"), null));
        now.addAndGet(9 * 3600_000L);
        assertNull(guard.outbound().preSend(delivery("staff", "/topic/pos"), null));
        assertThrows(AccessDeniedException.class, () -> subscribe("staff", "/topic/pos"));
        guard.preSend(frame(StompCommand.DISCONNECT,"staff",null,null),null);
        guard.preSend(frame(StompCommand.DISCONNECT,"staff",null,null),null);
        assertNull(guard.outbound().preSend(delivery("staff", "/topic/pos"), null));
    }
}
