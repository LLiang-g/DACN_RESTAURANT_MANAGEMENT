import { useEffect, useRef } from 'react';
import { Client } from '@stomp/stompjs';
import SockJS from 'sockjs-client';

interface PosEvent {
  type: string;
  tableId: number;
}

export function usePosSocket(onMessage: () => void, onEvent?: (event: PosEvent) => void) {
  const callbackRef = useRef(onMessage);
  callbackRef.current = onMessage;

  const eventRef = useRef(onEvent);
  eventRef.current = onEvent;

  useEffect(() => {
    const client = new Client({
      webSocketFactory: () => new SockJS('/ws'),
      reconnectDelay: 5000,
      onConnect: () => {
        client.subscribe('/topic/pos', (message) => {
          callbackRef.current();

          // Một số event (OrderItemStatusEvent, InvoiceStatusEvent...) không có field 'type',
          // nên bọc try/catch để tránh crash khi parse hoặc khi event.type không khớp.
          if (eventRef.current) {
            try {
              const parsed = JSON.parse(message.body);
              if (parsed && typeof parsed.type === 'string') {
                eventRef.current(parsed as PosEvent);
              }
            } catch {
              // payload không phải JSON có field 'type' -> bỏ qua, không phải lỗi
            }
          }
        });
      },
    });

    client.activate();
    return () => {
      client.deactivate();
    };
  }, []);
}