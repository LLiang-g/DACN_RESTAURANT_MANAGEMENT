import { useState } from 'react';
import type { KdsOrderItem } from '../types';
import { formatDateTimeSmart, getSla } from '../utils/time';
import SlaTimer from './SlaTimer';

interface Props {
  item: KdsOrderItem;
  now: number;
  /** Chỉ thẻ order đang được chọn mới cho bấm nút */
  interactive: boolean;
  onStart: (id: number) => void;
  onFinish: (id: number) => void;
}

/** Sau khi bấm Nấu, nút Xong bị khóa trong khoảng này (ms) để tránh bấm đúp nhầm. Chỉnh số này. */
const FINISH_LOCK_MS = 5000;

const STATE_TEXT: Record<string, string> = {
  CONFIRMED: 'Chờ nấu',
  COOKING: 'Đang nấu',
  DONE: 'Đã xong',
  SERVED: 'Đã phục vụ',
};

/** Thẻ món của khu bếp mình. */
export default function OrderItemRow({ item, now, interactive, onStart, onFinish }: Props) {
  const [lockedUntil, setLockedUntil] = useState(0);
  const lockLeft = Math.max(0, Math.ceil((lockedUntil - now) / 1000));

  const handleStart = () => {
    setLockedUntil(Date.now() + FINISH_LOCK_MS);
    onStart(item.id);
  };

  const sla = getSla(item, now);
  const level = sla ? sla.level : 'none';
  const stateText = sla?.level === 'late' ? 'Trễ' : STATE_TEXT[item.status] ?? item.status;

  return (
    <li className={`tile tile--${item.status.toLowerCase()} tile--sla-${level}`}>
      <span className="tile__dot" title={stateText} aria-label={stateText} />

      <div className="tile__title" title={item.foodName}>
        <span className="tile__qty">
          <small>×</small>
          {item.quantity}
        </span>
        <span className="tile__name">{item.foodName}</span>
      </div>

      {item.status !== 'DONE' && item.status !== 'SERVED' && <SlaTimer item={item} now={now} />}

      <div className="tile__action">
        {item.status === 'CONFIRMED' && (
          <button className="btn btn--start" disabled={!interactive} onClick={handleStart}>
            Nấu
          </button>
        )}
        {item.status === 'COOKING' && (
          <button
            className="btn btn--finish"
            disabled={!interactive || lockLeft > 0}
            onClick={() => onFinish(item.id)}
          >
            {lockLeft > 0 ? `Xong (${lockLeft}s)` : 'Xong'}
          </button>
        )}
      </div>

      {/* Hàng dưới cùng luôn cao bằng nhau: option/combo/ghi chú bên trái, giờ xong (nhỏ) bên phải */}
      <div className="tile__sub">
        <div className="tile__chips">
          {item.comboName && <span className="chip chip--combo">{item.comboName}</span>}
          {item.options.map((o) => (
            <span key={o} className="chip">
              {o}
            </span>
          ))}
          {item.note && <span className="tile__note">Ghi chú: {item.note}</span>}
        </div>
        {(item.status === 'DONE' || item.status === 'SERVED') && item.doneAt && (
          <span className="tile__done">xong lúc {formatDateTimeSmart(item.doneAt, now)}</span>
        )}
      </div>

      {sla && (
        <div className="tile__bar" aria-hidden="true">
          <div className="tile__bar-fill" style={{ width: `${Math.min(100, sla.ratio * 100)}%` }} />
        </div>
      )}
    </li>
  );
}
