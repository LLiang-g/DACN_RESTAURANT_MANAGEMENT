package com.sccgroup.restaurant_management.common.security;

import com.sccgroup.restaurant_management.config.WebSocketConfig;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.autoconfigure.EnableAutoConfiguration;
import org.springframework.boot.autoconfigure.jdbc.DataSourceAutoConfiguration;
import org.springframework.boot.autoconfigure.orm.jpa.HibernateJpaAutoConfiguration;
import org.springframework.boot.autoconfigure.security.servlet.SecurityAutoConfiguration;
import org.springframework.boot.autoconfigure.security.servlet.UserDetailsServiceAutoConfiguration;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.web.server.LocalServerPort;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Import;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.test.util.ReflectionTestUtils;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.WebSocket;
import java.time.Duration;
import java.util.Map;
import java.util.concurrent.*;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

/** Real embedded HTTP server, WebSocket transport and simple broker; no MySQL or application fixtures. */
@SpringBootTest(classes = StompBrokerSecurityTest.Application.class,
        webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT,
        properties = {"spring.config.location=optional:classpath:/ws-test-only.properties",
                "jwt.secret=AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=",
                "WS_ALLOWED_ORIGINS=http://localhost:5173", "spring.main.banner-mode=off"})
class StompBrokerSecurityTest {
    @Configuration(proxyBeanMethods = false)
    @EnableAutoConfiguration(excludeName = "org.springframework.boot.actuate.autoconfigure.security.servlet.ManagementWebSecurityAutoConfiguration", exclude = {DataSourceAutoConfiguration.class, HibernateJpaAutoConfiguration.class,
            SecurityAutoConfiguration.class, UserDetailsServiceAutoConfiguration.class})
    @Import(WebSocketConfig.class)
    static class Application {
        @Bean JwtUtil jwt() {
            var jwt = new JwtUtil();
            ReflectionTestUtils.setField(jwt,"secret", java.util.Base64.getEncoder().encodeToString(new byte[32]));
            return jwt;
        }
        @Bean CustomUserDetailsService users() {
            var users = mock(CustomUserDetailsService.class);
            for (String role : new String[]{"ADMIN", "RECEPTIONIST", "KITCHEN"}) {
                when(users.loadUserByUsername(role)).thenReturn(new AppUserPrincipal(1L,role,"unused","STAFF",role));
            }
            return users;
        }
        @Bean StompAccessGuard guard(JwtUtil jwt, CustomUserDetailsService users) { return new StompAccessGuard(jwt,users); }
    }

    @LocalServerPort int port;
    @Autowired JwtUtil jwt;
    @Autowired SimpMessagingTemplate broker;

    static class Peer implements WebSocket.Listener, AutoCloseable {
        final BlockingQueue<String> frames = new LinkedBlockingQueue<>();
        final StringBuilder fragments = new StringBuilder();
        WebSocket socket;
        public void onOpen(WebSocket socket) { socket.request(1); }
        public CompletionStage<?> onText(WebSocket socket, CharSequence text, boolean last) {
            fragments.append(text);
            if(last) { frames.add(fragments.toString()); fragments.setLength(0); }
            socket.request(1); return null;
        }
        public CompletionStage<?> onClose(WebSocket socket, int status, String reason) { frames.add("CLOSED"); return null; }
        public void onError(WebSocket socket, Throwable error) { frames.add("CLOSED"); }
        void send(String frame) { socket.sendText(frame + "\0",true).join(); }
        String await(String prefix) throws Exception {
            long end=System.nanoTime()+TimeUnit.SECONDS.toNanos(5);
            while(System.nanoTime()<end) {
                String frame=frames.poll(100,TimeUnit.MILLISECONDS);
                if(frame!=null && frame.startsWith(prefix)) return frame;
            }
            throw new AssertionError("No " + prefix + " frame received");
        }
        public void close() { if(socket!=null) socket.abort(); }
    }

    private Peer connect(String role) throws Exception {
        var peer = new Peer();
        peer.socket = HttpClient.newHttpClient().newWebSocketBuilder().connectTimeout(Duration.ofSeconds(5))
                .header("Origin","http://localhost:5173")
                .buildAsync(URI.create("ws://127.0.0.1:"+port+"/ws/websocket"),peer).join();
        String auth=role==null?"":"Authorization:Bearer "+jwt.generateToken(role, Map.of())+"\n";
        peer.send("CONNECT\naccept-version:1.2\nheart-beat:0,0\n"+auth+"\n");
        peer.await("CONNECTED"); return peer;
    }

    private String awaitDelivery(Peer peer, String topic, String body) throws Exception {
        // SimpleBroker has no STOMP receipts. Re-send harmless test signals until
        // the asynchronous subscription is registered and an actual delivery arrives.
        for(int i=0;i<50;i++) {
            broker.convertAndSend(topic,body);
            String frame=peer.frames.poll(100,TimeUnit.MILLISECONDS);
            if(frame!=null && frame.startsWith("MESSAGE")) return frame;
            if(frame!=null && (frame.startsWith("ERROR") || frame.equals("CLOSED"))) fail("Subscription rejected");
        }
        throw new AssertionError("No actual broker delivery");
    }

    @Test void authorizedPosReceivesActualBrokerMessage() throws Exception {
        try(var peer=connect("RECEPTIONIST")) {
            peer.send("SUBSCRIBE\nid:pos\ndestination:/topic/pos\n\n");
            assertTrue(awaitDelivery(peer,"/topic/pos","test-signal").contains("test-signal"));
        }
    }

    @Test void guestCanReceiveTableSignalWithoutJwt() throws Exception {
        try(var peer=connect(null)) {
            peer.send("SUBSCRIBE\nid:table\ndestination:/topic/table/12\n\n");
            assertTrue(awaitDelivery(peer,"/topic/table/12","table-signal").contains("table-signal"));
        }
    }

    @Test void guestAndWrongRoleAreRejectedByRealTransport() throws Exception {
        for(String role : new String[]{null,"KITCHEN"}) {
            try(var peer=connect(role)) {
                peer.send("SUBSCRIBE\nid:bad\ndestination:/topic/pos\n\n");
                peer.await("ERROR");
                broker.convertAndSend("/topic/pos","secret-signal");
                assertFalse(peer.frames.stream().anyMatch(f->f.startsWith("MESSAGE")));
            }
        }
    }

    @Test void clientSendIsRejectedEvenForAdmin() throws Exception {
        try(var peer=connect("ADMIN")) {
            peer.send("SEND\ndestination:/topic/pos\n\nforged-event"); peer.await("ERROR");
        }
    }

    @Test void foreignBrowserOriginCannotHandshake() {
        try(var peer=new Peer()) {
            assertThrows(CompletionException.class,()-> HttpClient.newHttpClient().newWebSocketBuilder()
                    .header("Origin","https://evil.example")
                    .buildAsync(URI.create("ws://127.0.0.1:"+port+"/ws/websocket"),peer).join());
        }
    }
}
