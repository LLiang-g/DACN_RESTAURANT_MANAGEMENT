import type { KdsOrderItem } from '../types';
import { formatClock, formatHourMinute, getSla } from '../utils/time';

interface Props {
  item: KdsOrderItem;
  now: number;
}

export default function SlaTimer({ item, now }: Props) {
  if (item.status === 'COOKING') {
    const sla = getSla(item, now);
    if (!sla) return <div className="timer timer--ok">Đang nấu</div>;
    const late = sla.remainingSec < 0;
    return (
      <div className={`timer timer--${sla.level}`}>
        <span className="timer__value">
          {late ? '+' : ''}
          {formatClock(Math.abs(sla.remainingSec))}
        </span>
        <span className="timer__label">{late ? 'đã trễ' : 'còn lại'}</span>
      </div>
    );
  }

  if (item.status === 'DONE' && item.doneAt) {
    return (
      <div className="timer timer--done">
        <span className="timer__value">{formatHourMinute(item.doneAt)}</span>
        <span className="timer__label">xong lúc</span>
      </div>
    );
  }

  if (item.estimatedCookingTime) {
    return (
      <div className="timer timer--idle">
        <span className="timer__value">{item.estimatedCookingTime}′</span>
        <span className="timer__label">dự kiến</span>
      </div>
    );
  }
  return null;
}
