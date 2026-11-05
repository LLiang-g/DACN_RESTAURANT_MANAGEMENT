import { useEffect, useRef, useState } from 'react';
import { Client } from '@stomp/stompjs';
import SockJS from 'sockjs-client';
interface PosEvent { type: string; tableId: number; }
export function usePosSocket(onMessage: () => void, onEvent?: (event: PosEvent) => void) {
  const callbackRef = useRef(onMessage);
  callbackRef.current = onMessage;
  const eventRef = useRef(onEvent);
  eventRef.current = onEvent;
  const [connected, setConnected] = useState(false);
  useEffect(() => {
    let hasConnected = false;
    const client = new Client({
      webSocketFactory: () => new SockJS('/ws'), reconnectDelay: 5000,
      onConnect: () => {
        setConnected(true);
        client.subscribe('/topic/pos', message => {
          callbackRef.current();
          try {
            const parsed = JSON.parse(message.body);
            if (parsed && typeof parsed.type === 'string') eventRef.current?.(parsed as PosEvent);
          } catch { /* A payload without type still triggers the data refresh above. */ }
        });
        if (hasConnected) callbackRef.current();
        hasConnected = true;
      },
      onWebSocketClose: () => setConnected(false),
      onDisconnect: () => setConnected(false),
      onStompError: () => setConnected(false),
    });
    client.activate();
    return () => { void client.deactivate(); };
  }, []);
  return connected;
}