import { useState } from 'react';
import type { KdsOrderItem } from '../types';
import { getSla } from '../utils/time';
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
      <div className="tile__top">
        <div className="tile__title">
          <span className="tile__qty">
            <small>×</small>
            {item.quantity}
          </span>
          <span className="tile__name">{item.foodName}</span>
        </div>
        <span className="tile__state">{stateText}</span>
      </div>

      {(item.options.length > 0 || item.comboName) && (
        <div className="tile__chips">
          {item.comboName && <span className="chip chip--combo">{item.comboName}</span>}
          {item.options.map((o) => (
            <span key={o} className="chip">
              {o}
            </span>
          ))}
        </div>
      )}
      {item.note && <div className="tile__note">Ghi chú: {item.note}</div>}

      <div className="tile__foot">
        <SlaTimer item={item} now={now} />
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

      {sla && (
        <div className="tile__bar" aria-hidden="true">
          <div className="tile__bar-fill" style={{ width: `${Math.min(100, sla.ratio * 100)}%` }} />
        </div>
      )}
    </li>
  );
}
