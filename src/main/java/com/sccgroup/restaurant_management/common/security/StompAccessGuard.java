package com.sccgroup.restaurant_management.common.security;

import org.springframework.context.event.EventListener;
import org.springframework.messaging.Message;
import org.springframework.messaging.MessageChannel;
import org.springframework.messaging.simp.SimpMessageHeaderAccessor;
import org.springframework.messaging.simp.SimpMessageType;
import org.springframework.messaging.support.ChannelInterceptor;
import org.springframework.messaging.support.MessageHeaderAccessor;
import org.springframework.messaging.simp.stomp.StompCommand;
import org.springframework.messaging.simp.stomp.StompHeaderAccessor;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.stereotype.Component;
import org.springframework.web.socket.messaging.SessionDisconnectEvent;

import java.time.Clock;
import java.util.Date;
import java.util.Map;
import java.util.Set;
import java.util.concurrent.ConcurrentHashMap;

/** Authorizes the existing server-to-client notification channels. No client SEND is supported. */
@Component
public class StompAccessGuard implements ChannelInterceptor {
    private final JwtUtil jwt;
    private final CustomUserDetailsService users;
    private final Clock clock;
    private final Map<String, SessionAccess> sessions = new ConcurrentHashMap<>();
    private record SessionAccess(Set<String> roles, long expiresAt) {}

    @org.springframework.beans.factory.annotation.Autowired
    public StompAccessGuard(JwtUtil jwt, CustomUserDetailsService users) {
        this(jwt, users, Clock.systemUTC());
    }

    StompAccessGuard(JwtUtil jwt, CustomUserDetailsService users, Clock clock) {
        this.jwt = jwt;
        this.users = users;
        this.clock = clock;
    }

    @Override
    public Message<?> preSend(Message<?> message, MessageChannel channel) {
        var headers = MessageHeaderAccessor.getAccessor(message, StompHeaderAccessor.class);
        if (headers == null || headers.getCommand() == null) return message; // heartbeat
        var command = headers.getCommand();
        String session = headers.getSessionId();
        if (command == StompCommand.DISCONNECT) {
            if (session != null) sessions.remove(session);
            return message;
        }
        if (command == StompCommand.CONNECT || command == StompCommand.STOMP) {
            connect(headers);
        } else if (command == StompCommand.SUBSCRIBE) {
            if (!permitted(session, headers.getDestination())) throw denied();
        } else if (command != StompCommand.UNSUBSCRIBE) {
            // Includes SEND to /topic, /app, /queue or arbitrary destinations.
            throw denied();
        }
        return message;
    }

    private void connect(StompHeaderAccessor headers) {
        String session = headers.getSessionId();
        if (session == null || sessions.containsKey(session)) throw denied();
        var values = headers.getNativeHeader("Authorization");
        if (values == null) {
            // No HTTP/transport principal is trusted as a substitute for a STOMP JWT.
            headers.setUser(null);
            sessions.put(session, new SessionAccess(Set.of(), Long.MAX_VALUE));
            return;
        }
        if (values.size() != 1 || !values.get(0).startsWith("Bearer ")) throw denied();
        try {
            String token = values.get(0).substring(7);
            var claims = jwt.extractClaims(token); // verifies signature and expiration
            Object expiry = claims.get("exp");
            long expiresAt = expiry instanceof Date d ? d.getTime()
                    : expiry instanceof Number n ? Math.multiplyExact(n.longValue(), 1000L) : 0;
            String username = jwt.extractUsername(token);
            if (expiresAt <= clock.millis() || username == null || username.isBlank()) throw denied();
            var user = users.loadUserByUsername(username);
            if (!user.isEnabled() || !user.isAccountNonLocked() || !user.isAccountNonExpired()
                    || !user.isCredentialsNonExpired()) throw denied();
            var auth = new UsernamePasswordAuthenticationToken(user, null, user.getAuthorities());
            var roles = user.getAuthorities().stream().map(a -> a.getAuthority())
                    .collect(java.util.stream.Collectors.toUnmodifiableSet());
            headers.setUser(auth); // Spring associates this principal with the STOMP session.
            sessions.put(session, new SessionAccess(roles, expiresAt));
        } catch (Exception exception) {
            throw denied(); // Never expose the token, parsing details or account existence.
        }
    }

    private boolean permitted(String session, String destination) {
        if (session == null || destination == null) return false;
        var access = sessions.get(session);
        if (access == null || access.expiresAt() <= clock.millis()) return false;
        if (destination.matches("/topic/table/[1-9][0-9]{0,18}")) return true;
        return switch (destination) {
            case "/topic/pos" -> access.roles().contains("ROLE_ADMIN") || access.roles().contains("ROLE_RECEPTIONIST");
            case "/topic/kds" -> access.roles().contains("ROLE_ADMIN") || access.roles().contains("ROLE_KITCHEN");
            case "/topic/admin/activity" -> access.roles().contains("ROLE_ADMIN");
            default -> false; // Deny wildcards, other topics and /user routes by default.
        };
    }

    /** Re-check each delivery so an idle subscription cannot keep reading after JWT expiry. */
    public ChannelInterceptor outbound() {
        return new ChannelInterceptor() {
            @Override
            public Message<?> preSend(Message<?> message, MessageChannel channel) {
                if (SimpMessageHeaderAccessor.getMessageType(message.getHeaders()) != SimpMessageType.MESSAGE) return message;
                return permitted(SimpMessageHeaderAccessor.getSessionId(message.getHeaders()),
                        SimpMessageHeaderAccessor.getDestination(message.getHeaders())) ? message : null;
            }
        };
    }

    @EventListener
    public void disconnected(SessionDisconnectEvent event) {
        sessions.remove(event.getSessionId()); // Idempotent; also handles transport failures.
    }

    private static AccessDeniedException denied() {
        return new AccessDeniedException("WebSocket access denied");
    }
}
