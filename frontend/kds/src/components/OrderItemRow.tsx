import { useState } from 'react';
import type { KdsOrderItem } from '../types';
import { formatDateTimeSmart, getSla } from '../utils/time';
import SlaTimer from './SlaTimer';

interface Props {
  item: KdsOrderItem;
  now: number;
  /** Chỉ thẻ order đang được chọn mới cho bấm nút */
  interactive: boolean;
  onStart: (id: number) => void | Promise<void>;
  onFinish: (id: number) => void | Promise<void>;
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
  const [sending, setSending] = useState(false);
  const lockLeft = Math.max(0, Math.ceil((lockedUntil - now) / 1000));

  const handleStart = async () => {
    if (sending) return;
    setSending(true);
    setLockedUntil(Date.now() + FINISH_LOCK_MS);
    try { await onStart(item.id); } finally { setSending(false); }
  };
  const handleFinish = async () => {
    if (sending) return;
    setSending(true);
    try { await onFinish(item.id); } finally { setSending(false); }
  };

  const sla = getSla(item, now);
  const level = sla ? sla.level : 'none';
  const stateText = sla?.level === 'late' ? 'Trễ' : STATE_TEXT[item.status] ?? item.status;

  return (
    <li className={`tile tile--${item.status.toLowerCase()} tile--sla-${level}`}>
      <span className="tile__dot" title={stateText} aria-label={stateText} />
      <span className="tile__state-label">{stateText}</span>

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
          <button className="btn btn--start" disabled={!interactive || sending} onClick={() => void handleStart()}>
            {sending ? 'Đang gửi…' : 'Bắt đầu nấu'}
          </button>
        )}
        {item.status === 'COOKING' && (
          <button
            className="btn btn--finish"
            disabled={!interactive || lockLeft > 0 || sending}
            onClick={() => void handleFinish()}
          >
            {sending ? 'Đang gửi…' : lockLeft > 0 ? `Xong (${lockLeft}s)` : 'Hoàn thành'}
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
