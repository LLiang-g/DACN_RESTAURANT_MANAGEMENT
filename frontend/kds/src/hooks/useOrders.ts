import { useCallback, useEffect, useState } from 'react';
import { fetchOrders, finishItem, startCooking } from '../api/kdsApi';
import type { KdsOrder } from '../types';

export function useOrders() {
  const [orders, setOrders] = useState<KdsOrder[]>([]);
  const [loading, setLoading] = useState(true);

  const reload = useCallback(async () => {
    setOrders(await fetchOrders());
    setLoading(false);
  }, []);

  // TODO: thay bằng realtime/ (WebSocket hoặc SSE) khi có backend.
  useEffect(() => {
    void reload();
  }, [reload]);

  const start = useCallback(
    async (itemId: number) => {
      await startCooking(itemId);
      await reload();
    },
    [reload],
  );

  const finish = useCallback(
    async (itemId: number) => {
      await finishItem(itemId);
      await reload();
    },
    [reload],
  );

  return { orders, loading, start, finish };
}
