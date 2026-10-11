import type { KdsOrderItem } from '../types';

export function formatClock(totalSeconds: number): string {
  const s = Math.max(0, Math.floor(totalSeconds));
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${String(m).padStart(2, '0')}:${String(r).padStart(2, '0')}`;
}

export function formatHourMinute(iso: string): string {
  return new Date(iso).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
}

export function minutesAgo(iso: string, now: number): number {
  return Math.max(0, Math.floor((now - new Date(iso).getTime()) / 60000));
}

export type SlaLevel = 'ok' | 'warn' | 'late';

export interface SlaInfo {
  elapsedSec: number;
  limitSec: number;
  /** > 0: còn lại, < 0: đã trễ */
  remainingSec: number;
  ratio: number;
  level: SlaLevel;
}

/** Ngưỡng cảnh báo vàng khi đã dùng quá 75% thời gian dự kiến — chỉnh ở đây. */
const WARN_RATIO = 0.75;

export function getSla(item: KdsOrderItem, now: number): SlaInfo | null {
  if (item.status !== 'COOKING' || !item.startedCookingAt || !item.estimatedCookingTime) {
    return null;
  }
  const limitSec = item.estimatedCookingTime * 60;
  const elapsedSec = Math.max(0, (now - new Date(item.startedCookingAt).getTime()) / 1000);
  const ratio = elapsedSec / limitSec;
  const level: SlaLevel = ratio >= 1 ? 'late' : ratio >= WARN_RATIO ? 'warn' : 'ok';
  return { elapsedSec, limitSec, remainingSec: limitSec - elapsedSec, ratio, level };
}
