import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import OrderCard from '../components/OrderCard';
import { getSla } from '../utils/time';
import { useNow } from '../hooks/useNow';
import { useOrders } from '../hooks/useOrders';
import type { KdsOrder, Session } from '../types';

const VISIBLE = new Set(['CONFIRMED', 'COOKING', 'DONE', 'SERVED']);

/** Chờ một chút sau khi bấm Xong cuối cùng để bếp kịp thấy kết quả rồi mới chuyển thẻ (ms). */
const AUTO_ADVANCE_DELAY = 700;

interface Props {
  session: Session;
  onSignOut: () => void;
}

export default function KitchenBoardPage({ session, onSignOut }: Props) {
  const now = useNow();
  const { orders, loading, error, connected, start, finish, dismissError, refresh } = useOrders();
  // Khu bếp lấy từ tài khoản đang đăng nhập
  const stationId = session.stationId;
  const station = { id: session.stationId, name: session.stationName };

  // Dải thẻ hiện nhiều order cùng lúc: first..last là các order đang nằm trong khung nhìn
  const [range, setRange] = useState({ first: 0, last: 0 });
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
      done: mine.filter((i) => i.status === 'DONE').length,
      late: mine.filter((i) => getSla(i, now)?.level === 'late').length,
    };
  }, [board, stationId, now]);

  const goTo = useCallback((index: number, behavior: ScrollBehavior = 'smooth') => {
    const rail = railRef.current;
    if (!rail) return;
    const card = rail.children[index] as HTMLElement | undefined;
    card?.scrollIntoView({ behavior, inline: 'start', block: 'nearest' });
  }, []);

  const rangeRef = useRef(range);
  rangeRef.current = range;
  const pendingRef = useRef<{ stationId: number; byOrder: Map<number, number> }>({
    stationId,
    byOrder: new Map(),
  });
  const advanceTimer = useRef<number | undefined>(undefined);

  // Khi các món của khu mình trong một order đang xem đều đã xong -> đẩy đơn đầu tiên còn việc về đầu dải.
  useEffect(() => {
    const prev = pendingRef.current;
    const sameStation = prev.stationId === stationId;
    const next = new Map<number, number>();
    const hasWork = (o: KdsOrder) =>
      o.items.some((i) => i.stationId === stationId && (i.status === 'CONFIRMED' || i.status === 'COOKING'));

    board.forEach((o, idx) => {
      const pending = o.items.filter(
        (i) => i.stationId === stationId && (i.status === 'CONFIRMED' || i.status === 'COOKING'),
      ).length;
      next.set(o.id, pending);

      const before = prev.byOrder.get(o.id);
      const justFinished = sameStation && before !== undefined && before > 0 && pending === 0;
      const inView = idx >= rangeRef.current.first && idx <= rangeRef.current.last;
      if (justFinished && inView) {
        // Đơn đầu tiên còn việc của khu mình (đơn không có món nào của khu mình tự bị bỏ qua).
        const target = board.findIndex(hasWork);
        if (target > rangeRef.current.first) {
          window.clearTimeout(advanceTimer.current);
          advanceTimer.current = window.setTimeout(() => {
            // Chỉ cuộn nếu đơn đó vẫn chưa ở đầu dải (bếp chưa tự cuộn chỗ khác).
            if (target > rangeRef.current.first) goTo(target);
          }, AUTO_ADVANCE_DELAY);
        }
      }
    });

    pendingRef.current = { stationId, byOrder: next };
  }, [board, stationId, goTo]);

  useEffect(() => () => window.clearTimeout(advanceTimer.current), []);

  // Mở trang lần đầu: lướt ngay tới đơn chưa hoàn thành cũ nhất (ưu tiên đơn còn việc của khu mình)
  const didInitialScroll = useRef(false);
  useEffect(() => {
    if (didInitialScroll.current || loading || board.length === 0 || !railRef.current) return;
    didInitialScroll.current = true;
    const pending = (o: KdsOrder, ownOnly: boolean) =>
      o.items.some(
        (i) => (!ownOnly || i.stationId === stationId) && (i.status === 'CONFIRMED' || i.status === 'COOKING'),
      );
    let target = board.findIndex((o) => pending(o, true));
    if (target === -1) target = board.findIndex((o) => pending(o, false));
    if (target > 0) goTo(target, 'auto');
  }, [board, loading, stationId, goTo]);

  // Xác định các order đang nằm (phần lớn) trong khung nhìn theo vị trí cuộn.
  const onScroll = useCallback(() => {
    const rail = railRef.current;
    if (!rail || rail.children.length === 0) return;
    const view = rail.getBoundingClientRect();
    let first = -1;
    let last = -1;
    Array.from(rail.children).forEach((el, idx) => {
      const r = (el as HTMLElement).getBoundingClientRect();
      const overlap = Math.min(r.right, view.right) - Math.max(r.left, view.left);
      if (overlap >= r.width * 0.6) {
        if (first === -1) first = idx;
        last = idx;
      }
    });
    if (first === -1) return;
    setRange((prev) => (prev.first === first && prev.last === last ? prev : { first, last }));
  }, []);

  // Tính lại khi số order đổi hoặc cửa sổ đổi kích thước
  useEffect(() => {
    onScroll();
    window.addEventListener('resize', onScroll);
    return () => window.removeEventListener('resize', onScroll);
  }, [onScroll, board.length]);

  // Phím mũi tên trái/phải: cuộn từng order
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLElement && (e.target.closest('input, textarea, select') || e.target.isContentEditable)) return;
      if (e.key === 'ArrowRight') { e.preventDefault(); goTo(Math.min(board.length - 1, range.first + 1)); }
      if (e.key === 'ArrowLeft') { e.preventDefault(); goTo(Math.max(0, range.first - 1)); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [range.first, board.length, goTo]);

  const firstOwnWork = board.findIndex(order => order.items.some(item => item.stationId === stationId && ['CONFIRMED','COOKING'].includes(item.status)));
  return (
    <div className="app">
      <header className="topbar">
        <div className="kds-brand"><span className="kds-logo" aria-hidden="true">S·</span><div>SMART KITCHEN<small>ĐIỀU PHỐI CHẾ BIẾN</small></div></div>
        <div className="kds-station-context"><span className="kds-context-label">KHU BẾP HIỆN TẠI</span><strong>{station.name}</strong></div>
        <div className="kds-metrics" role="group" aria-label="T?nh h?nh khu b?p"><div className="kds-metric"><span><i className="kds-dot wait" /> Chờ nấu</span><strong>{loading ? '—' : counts.waiting.toString().padStart(2,'0')}</strong></div><div className="kds-metric cooking"><span><i className="kds-dot cook" /> Đang nấu</span><strong>{loading ? '—' : counts.cooking.toString().padStart(2,'0')}</strong></div><div className="kds-metric"><span><i className="kds-dot done" /> Đã xong</span><strong>{loading ? '—' : counts.done.toString().padStart(2,'0')}</strong></div><div className={`kds-metric ${counts.late ? 'late' : ''}`}><span><i className="kds-dot late" /> Trễ SLA</span><strong>{loading ? '—' : counts.late.toString().padStart(2,'0')}</strong></div></div>
        <div className="topbar__right"><span className={`live ${connected ? 'live--on' : 'live--off'}`} title={connected ? 'Đang nhận đơn trực tiếp' : 'Mất kết nối trực tiếp, đang tải định kỳ'}><i className="live__dot" aria-hidden="true" />{connected ? 'Kết nối trực tiếp' : 'Mất kết nối'}</span><time className="clock">{new Date(now).toLocaleTimeString('vi-VN',{hour:'2-digit',minute:'2-digit'})}</time><span className="kds-user">{session.username}</span><button className="logout-btn" onClick={onSignOut}>Đăng xuất <span aria-hidden="true">↗</span></button></div>
      </header>
      <div className="kds-board-toolbar"><div className="kds-board-label"><h2>Hàng đợi chế biến</h2><span>{loading ? 'Đang tải…' : `${board.length} đơn`}</span></div><div className="kds-board-actions"><button className="kds-text-button" disabled={firstOwnWork < 0} onClick={() => goTo(firstOwnWork)}>Đơn còn việc <span aria-hidden="true">↗</span></button><button className="kds-refresh" onClick={() => void refresh()} aria-label="Làm mới danh sách đơn">↻ <span>Làm mới</span></button><div className="kds-paging"><button className="nav-btn" onClick={() => goTo(range.first-1)} disabled={range.first<=0 || !board.length} aria-label="Đơn trước">‹</button><span className="pager">{board.length === 0 ? '0' : range.first === range.last ? range.first+1 : `${range.first+1}–${range.last+1}`}<small> / {board.length}</small></span><button className="nav-btn" onClick={() => goTo(range.first+1)} disabled={range.last>=board.length-1 || !board.length} aria-label="Đơn sau">›</button></div></div></div>
      {error && <div className="toast" role="alert"><span>{error}</span><button onClick={() => void refresh()}>Thử tải lại</button><button onClick={dismissError} aria-label="Đóng thông báo lỗi">✕</button></div>}
      <main className="board" aria-label="Các đơn đã được duyệt">
        {loading ? <div className="kds-skeleton" role="status" aria-label="Đang tải đơn">{[1,2,3].map(key => <div key={key}><span /><i /><i /><i /></div>)}</div>
          : board.length === 0 ? <div className="board__empty"><span className="kds-empty-icon" aria-hidden="true">✓</span><h2>Bếp đã sẵn sàng</h2><p>Chưa có đơn cần hiển thị. Đơn mới sẽ xuất hiện sau khi lễ tân duyệt.</p><button className="kds-refresh" onClick={() => void refresh()}>↻ Làm mới danh sách</button></div>
          : <div className="rail" ref={railRef} onScroll={onScroll} aria-label="Dải đơn hàng">{board.map(order => <OrderCard key={order.id} order={order} stationId={stationId} stationName={station.name} now={now} onStart={start} onFinish={finish} />)}</div>}
      </main>
      <footer className="kds-footer"><span><i className="kds-dot wait" /> Chờ nấu <i className="kds-dot cook" /> Đang nấu <i className="kds-dot done" /> Đã xong <i className="kds-dot late" /> Trễ SLA</span><span>Dùng phím ← → hoặc vuốt ngang để chuyển đơn</span></footer>
    </div>
  );
}