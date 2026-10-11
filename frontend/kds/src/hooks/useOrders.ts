import { useCallback, useEffect, useState } from 'react';
import { errorMessage } from '../api/httpClient';
import { fetchOrders, finishItem, startCooking } from '../api/kdsApi';
import { connectKdsSocket } from '../realtime/kdsSocket';
import type { KdsOrder } from '../types';

/** Dự phòng: vẫn tải lại định kỳ phòng khi mất tín hiệu realtime (ms). */
const FALLBACK_POLL_MS = 30_000;
const ERROR_VISIBLE_MS = 6_000;

export function useOrders() {
  const [orders, setOrders] = useState<KdsOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [connected, setConnected] = useState(false);

  const reload = useCallback(async () => {
    try {
      setOrders(await fetchOrders());
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setLoading(false);
    }
  }, []);

  // Realtime: có tín hiệu thì tải lại (gộp các tín hiệu dồn dập trong 150ms)
  useEffect(() => {
    let timer: number | undefined;
    const disconnect = connectKdsSocket(() => {
      window.clearTimeout(timer);
      timer = window.setTimeout(() => void reload(), 150);
    }, setConnected);
    return () => {
      window.clearTimeout(timer);
      disconnect();
    };
  }, [reload]);

  useEffect(() => {
    const id = window.setInterval(() => void reload(), FALLBACK_POLL_MS);
    return () => window.clearInterval(id);
  }, [reload]);

  // Thông báo lỗi tự ẩn sau vài giây
  useEffect(() => {
    if (!error) return;
    const t = window.setTimeout(() => setError(null), ERROR_VISIBLE_MS);
    return () => window.clearTimeout(t);
  }, [error]);

  /** Chạy một thao tác, lỗi thì báo cho bếp; xong luôn tải lại để thấy dữ liệu thật. */
  const act = useCallback(
    async (action: () => Promise<void>) => {
      let failure: string | null = null;
      try {
        await action();
      } catch (e) {
        failure = errorMessage(e);
      }
      await reload();
      if (failure) setError(failure);
    },
    [reload],
  );

  const start = useCallback((itemId: number) => act(() => startCooking(itemId)), [act]);
  const finish = useCallback((itemId: number) => act(() => finishItem(itemId)), [act]);
  const dismissError = useCallback(() => setError(null), []);

  return { orders, loading, error, connected, start, finish, dismissError };
}
