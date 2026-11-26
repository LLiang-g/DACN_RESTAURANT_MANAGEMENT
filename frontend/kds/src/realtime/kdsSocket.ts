import { getToken } from '../auth/tokenStorage';
import { Client } from '@stomp/stompjs';
import SockJS from 'sockjs-client';

/**
 * Nghe tín hiệu "dữ liệu KDS đã thay đổi" từ backend (STOMP over SockJS, topic /topic/kds).
 * onChanged được gọi mỗi khi có tín hiệu và cả khi vừa (kết nối lại) để bù phần đã lỡ.
 * @returns hàm ngắt kết nối
 */
export function connectKdsSocket(onChanged: () => void, onStatus?: (connected: boolean) => void): () => void {
  const client = new Client({
    webSocketFactory: () => new SockJS('/ws') as unknown as WebSocket,
    reconnectDelay: 3000,
    beforeConnect: () => {
      const token = getToken();
      client.connectHeaders = token ? { Authorization: `Bearer ${token}` } : {};
    },
    onConnect: () => {
      onStatus?.(true);
      client.subscribe('/topic/kds', () => onChanged());
      onChanged();
    },
    onStompError: () => onStatus?.(false),
    onWebSocketClose: () => onStatus?.(false),
  });
  client.activate();
  return () => {
    void client.deactivate();
  };
}
