import type { KdsOrder } from '../types';
import { request } from './httpClient';

/** Order còn món chờ nấu / đang nấu / đã xong (mọi khu bếp thấy hết). */
export function fetchOrders(): Promise<KdsOrder[]> {
  return request<KdsOrder[]>('/api/kds/orders');
}

/** Bếp bấm "Nấu": CONFIRMED -> COOKING (backend trừ kho theo BOM). */
export function startCooking(itemId: number): Promise<void> {
  return request<void>(`/api/kds/items/${itemId}/start`, { method: 'POST' });
}

/** Bếp bấm "Xong": COOKING -> DONE. */
export function finishItem(itemId: number): Promise<void> {
  return request<void>(`/api/kds/items/${itemId}/finish`, { method: 'POST' });
}
