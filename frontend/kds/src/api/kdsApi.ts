import type { KdsOrder } from '../types';
import { createSeedOrders } from './mockData';

/**
 * Lớp gọi backend. Hiện dùng dữ liệu giả trong bộ nhớ.
 * Khi nối backend thật chỉ cần thay thân 3 hàm này bằng fetch().
 */
let store: KdsOrder[] = createSeedOrders();

const delay = (ms = 120) => new Promise((r) => setTimeout(r, ms));

export async function fetchOrders(): Promise<KdsOrder[]> {
  await delay();
  return structuredClone(store);
}

/** Bếp bấm "Nấu": CONFIRMED -> COOKING (backend sẽ trừ kho theo BOM ở bước này). */
export async function startCooking(itemId: number): Promise<void> {
  await delay();
  const now = new Date().toISOString();
  store = store.map((o) => ({
    ...o,
    items: o.items.map((i) =>
      i.id === itemId && i.status === 'CONFIRMED'
        ? { ...i, status: 'COOKING', startedCookingAt: now }
        : i,
    ),
  }));
}

/** Bếp bấm "Xong": COOKING -> DONE. */
export async function finishItem(itemId: number): Promise<void> {
  await delay();
  const now = new Date().toISOString();
  store = store.map((o) => ({
    ...o,
    items: o.items.map((i) =>
      i.id === itemId && i.status === 'COOKING' ? { ...i, status: 'DONE', doneAt: now } : i,
    ),
  }));
}
