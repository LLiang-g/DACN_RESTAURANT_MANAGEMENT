import type { KdsOrder, KdsOrderItem } from '../types';
import { getSla, minutesAgo } from '../utils/time';
import OrderItemRow from './OrderItemRow';
import OtherStationRow from './OtherStationRow';

interface Props {
  order: KdsOrder;
  stationId: number;
  stationName: string;
  now: number;
  active: boolean;
  onFocus: () => void;
  onStart: (id: number) => void;
  onFinish: (id: number) => void;
}

const RANK: Record<string, number> = { COOKING: 0, CONFIRMED: 1, DONE: 2 };
/** Đang nấu lên đầu (món trễ nhất trước), rồi chờ nấu, rồi đã xong. */
function makeSorter(now: number) {
  return (a: KdsOrderItem, b: KdsOrderItem) => {
    const byRank = (RANK[a.status] ?? 9) - (RANK[b.status] ?? 9);
    if (byRank !== 0) return byRank;
    return (getSla(b, now)?.ratio ?? 0) - (getSla(a, now)?.ratio ?? 0);
  };
}
const byStatus = (a: KdsOrderItem, b: KdsOrderItem) => (RANK[a.status] ?? 9) - (RANK[b.status] ?? 9);

export default function OrderCard({
  order,
  stationId,
  stationName,
  now,
  active,
  onFocus,
  onStart,
  onFinish,
}: Props) {
  const sorter = makeSorter(now);
  const own = order.items.filter((i) => i.stationId === stationId).sort(sorter);
  const others = order.items.filter((i) => i.stationId !== stationId).sort(sorter);

  const total = order.items.length;
  const done = order.items.filter((i) => i.status === 'DONE').length;
  const waited = minutesAgo(order.createdAt, now);

  return (
    <article
      className={`card ${active ? 'card--active' : 'card--side'}`}
      onClick={active ? undefined : onFocus}
      aria-current={active}
    >
      <header className="card__head">
        <div className="card__table">
          <span className="card__table-no">{order.tableNumber}</span>
          <span className="card__floor">{order.floor}</span>
        </div>

        <div className="card__meta">
          <div className="card__order">Order #{order.id}</div>
          <div className={`card__wait ${waited >= 15 ? 'card__wait--long' : ''}`}>
            Đặt {waited} phút trước
          </div>
        </div>

        <div className="card__progress">
          <div className="card__progress-text">
            {done}/{total} món xong
          </div>
          <div className="segments" aria-hidden="true">
            {order.items
              .slice()
              .sort(byStatus)
              .reverse()
              .map((i) => (
                <span key={i.id} className={`seg seg--${i.status.toLowerCase()}`} />
              ))}
          </div>
        </div>
      </header>

      <div className="card__body">
        <section>
          <h2 className="section-title">Món của {stationName}</h2>
          {own.length === 0 ? (
            <p className="empty">Đơn này không có món nào cho khu của bạn.</p>
          ) : (
            <ul className="grid">
              {own.map((i) => (
                <OrderItemRow
                  key={i.id}
                  item={i}
                  now={now}
                  interactive={active}
                  onStart={onStart}
                  onFinish={onFinish}
                />
              ))}
            </ul>
          )}
        </section>

        {others.length > 0 && (
          <section className="card__others">
            <h2 className="section-title section-title--muted">Khu bếp khác</h2>
            <ul className="grid grid--others">
              {others.map((i) => (
                <OtherStationRow key={i.id} item={i} now={now} />
              ))}
            </ul>
          </section>
        )}
      </div>
    </article>
  );
}
