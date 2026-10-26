import { useEffect, useRef } from 'react';
import { Client } from '@stomp/stompjs';
import SockJS from 'sockjs-client';

/**
 * Lắng nghe topic /topic/pos — mỗi khi backend bắn sự kiện (đơn mới,
 * món nấu xong, có yêu cầu gọi NV...), gọi lại onMessage() để trang
 * tự fetch lại dữ liệu mới nhất, thay vì tự vá state thủ công.
 *
 * Dùng useRef để giữ callback mới nhất mà KHÔNG đưa onMessage vào
 * dependency array của useEffect — nếu không, mỗi lần component
 * re-render (callback đổi identity) sẽ làm effect chạy lại, ngắt kết
 * nối cũ và mở kết nối WebSocket mới liên tục.
 */
export function usePosSocket(onMessage: () => void) {
  const callbackRef = useRef(onMessage);
  callbackRef.current = onMessage;

  useEffect(() => {
    const client = new Client({
      // Dùng đường dẫn tương đối "/ws" (không phải "http://localhost:8080/ws")
      // để đi qua proxy của Vite đã cấu hình ở vite.config.ts — nhất quán với
      // cách api/client.ts gọi REST API qua "/api/..." thay vì gọi thẳng cổng 8080.
      webSocketFactory: () => new SockJS('/ws'),
      reconnectDelay: 5000,
      onConnect: () => {
        client.subscribe('/topic/pos', () => {
          callbackRef.current();
        });
      },
    });

    client.activate();
    return () => {
      client.deactivate();
    };
  }, []); // mảng dependency rỗng -> chỉ kết nối 1 lần khi component mount
}