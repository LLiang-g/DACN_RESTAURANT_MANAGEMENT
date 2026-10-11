import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import OrderCard from '../components/OrderCard';
import { useNow } from '../hooks/useNow';
import { useOrders } from '../hooks/useOrders';
import type { KdsOrder, Session } from '../types';

const VISIBLE = new Set(['CONFIRMED', 'COOKING', 'DONE']);

/** Chờ một chút sau khi bấm Xong cuối cùng để bếp kịp thấy kết quả rồi mới chuyển thẻ (ms). */
const AUTO_ADVANCE_DELAY = 700;

interface Props {
  session: Session;
  onSignOut: () => void;
}

export default function KitchenBoardPage({ session, onSignOut }: Props) {
  const now = useNow();
  const { orders, loading, error, connected, start, finish, dismissError } = useOrders();
  // Khu bếp lấy từ tài khoản đang đăng nhập
  const stationId = session.stationId;
  const station = { id: session.stationId, name: session.stationName };

  const [activeIndex, setActiveIndex] = useState(0);
  const railRef = useRef<HTMLDivElement>(null);

  // Chỉ hiện order còn món đang chờ / đang nấu / vừa xong, cũ nhất đứng trước.
  const board: KdsOrder[] = useMemo(
    () =>
      orders
        .map((o) => ({ ...o, items: o.items.filter((i) => VISIBLE.has(i.status)) }))
        .filter((o) => o.items.length > 0)
        .sort((a, b) => a.createdAt.localeCompare(b.createdAt)),
    [orders],
  );

  const counts = useMemo(() => {
    const mine = board.flatMap((o) => o.items).filter((i) => i.stationId === stationId);
    return {
      waiting: mine.filter((i) => i.status === 'CONFIRMED').length,
      cooking: mine.filter((i) => i.status === 'COOKING').length,
    };
  }, [board, stationId]);

  const goTo = useCallback((index: number) => {
    const rail = railRef.current;
    if (!rail) return;
    const card = rail.children[index] as HTMLElement | undefined;
    card?.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
  }, []);

  const activeIndexRef = useRef(0);
  activeIndexRef.current = activeIndex;
  const pendingRef = useRef<{ stationId: number; byOrder: Map<number, number> }>({
    stationId,
    byOrder: new Map(),
  });
  const advanceTimer = useRef<number | undefined>(undefined);

  // Khi các món của khu mình trong thẻ đang xem đều đã xong -> tự chuyển sang đơn kế tiếp.
  useEffect(() => {
    const prev = pendingRef.current;
    const sameStation = prev.stationId === stationId;
    const next = new Map<number, number>();

    board.forEach((o, idx) => {
      const pending = o.items.filter(
        (i) => i.stationId === stationId && (i.status === 'CONFIRMED' || i.status === 'COOKING'),
      ).length;
      next.set(o.id, pending);

      const before = prev.byOrder.get(o.id);
      const justFinished = sameStation && before !== undefined && before > 0 && pending === 0;
      if (justFinished && idx === activeIndexRef.current && idx < board.length - 1) {
        window.clearTimeout(advanceTimer.current);
        advanceTimer.current = window.setTimeout(() => {
          // Chỉ chuyển nếu bếp vẫn đang xem đúng thẻ đó (chưa tự cuộn sang chỗ khác).
          if (activeIndexRef.current === idx) goTo(idx + 1);
        }, AUTO_ADVANCE_DELAY);
      }
    });

    pendingRef.current = { stationId, byOrder: next };
  }, [board, stationId, goTo]);

  useEffect(() => () => window.clearTimeout(advanceTimer.current), []);

  // Xác định thẻ đang ở giữa màn hình theo vị trí cuộn.
  const onScroll = useCallback(() => {
    const rail = railRef.current;
    if (!rail || rail.children.length === 0) return;
    const center = rail.scrollLeft + rail.clientWidth / 2;
    let best = 0;
    let bestDist = Infinity;
    Array.from(rail.children).forEach((el, idx) => {
      const c = el as HTMLElement;
      const dist = Math.abs(c.offsetLeft + c.offsetWidth / 2 - center);
      if (dist < bestDist) {
        bestDist = dist;
        best = idx;
      }
    });
    setActiveIndex(best);
  }, []);

  // Giữ activeIndex hợp lệ khi số order thay đổi.
  useEffect(() => {
    if (activeIndex > board.length - 1) setActiveIndex(Math.max(0, board.length - 1));
  }, [board.length, activeIndex]);

  // Phím mũi tên trái/phải để chuyển thẻ.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight') goTo(Math.min(board.length - 1, activeIndex + 1));
      if (e.key === 'ArrowLeft') goTo(Math.max(0, activeIndex - 1));
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [activeIndex, board.length, goTo]);

  return (
    <div className="app">
      <header className="topbar">
        <div className="topbar__left">
          <div className="station-badge">{station.name}</div>
          <span
            className={`live ${connected ? 'live--on' : 'live--off'}`}
            title={connected ? 'Đang nhận đơn trực tiếp' : 'Mất kết nối trực tiếp, đang tải định kỳ'}
          >
            <i className="live__dot" />
            {connected ? 'Trực tiếp' : 'Mất kết nối'}
          </span>
        </div>

        <div className="topbar__stats">
          <div className="stat stat--wait">
            <b>{counts.waiting}</b> chờ nấu
          </div>
          <div className="stat stat--cook">
            <b>{counts.cooking}</b> đang nấu
          </div>
        </div>

        <div className="topbar__right">
          <button className="nav-btn" onClick={() => goTo(activeIndex - 1)} disabled={activeIndex <= 0} aria-label="Order trước">
            ‹
          </button>
          <span className="pager">
            {board.length === 0 ? 0 : activeIndex + 1} / {board.length}
          </span>
          <button
            className="nav-btn"
            onClick={() => goTo(activeIndex + 1)}
            disabled={activeIndex >= board.length - 1}
            aria-label="Order sau"
          >
            ›
          </button>
          <time className="clock">
            {new Date(now).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
          </time>
          <button className="logout-btn" onClick={onSignOut}>
            Đăng xuất
          </button>
        </div>
      </header>

      {error && (
        <div className="toast" role="alert" onClick={dismissError}>
          {error}
        </div>
      )}

      <main className="board">
        {loading ? (
          <p className="board__empty">Đang tải đơn…</p>
        ) : board.length === 0 ? (
          <p className="board__empty">Chưa có order nào cần làm. Order mới sẽ hiện ở đây ngay khi lễ tân duyệt.</p>
        ) : (
          <div className="rail" ref={railRef} onScroll={onScroll}>
            {board.map((order, idx) => (
              <OrderCard
                key={order.id}
                order={order}
                stationId={stationId}
                stationName={station.name}
                now={now}
                active={idx === activeIndex}
                onFocus={() => goTo(idx)}
                onStart={start}
                onFinish={finish}
              />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
