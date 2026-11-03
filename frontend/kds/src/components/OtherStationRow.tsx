import type { KdsOrderItem } from '../types';
import { getSla, formatClock } from '../utils/time';

const STATUS_TEXT: Record<string, string> = {
  CONFIRMED: 'Chờ nấu',
  COOKING: 'Đang nấu',
  DONE: 'Đã xong',
  SERVED: 'Đã phục vụ',
};

export default function OtherStationRow({ item, now }: { item: KdsOrderItem; now: number }) {
  const sla = getSla(item, now);
  return (
    <li className={`other other--${item.status.toLowerCase()}`}>
      <span className="other__qty">
        <small>×</small>
        {item.quantity}
      </span>
      <span className="other__name">{item.foodName}</span>
      <span className="other__station">{item.stationName}</span>
      <span className="other__status">
        {STATUS_TEXT[item.status] ?? item.status}
        {sla && ` · ${sla.remainingSec < 0 ? '+' : ''}${formatClock(Math.abs(sla.remainingSec))}`}
      </span>
    </li>
  );
}
