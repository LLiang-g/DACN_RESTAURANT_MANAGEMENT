import { useCallback, useEffect, useState } from 'react';
import { posApi } from '../api/posApi';
import type { PendingOrder, TableOverview, CallStaffRequest } from '../types/pos';
import { usePosSocket } from '../hooks/usePosSocket';
import PendingOrdersPanel from '../components/PendingOrdersPanel';
import TableOverviewPanel from '../components/TableOverviewPanel';
import CallStaffPanel from '../components/CallStaffPanel';
import InvoiceDetailModal from '../components/InvoiceDetailModal';
import './PosDashboard.css';

type Tab = 'tables' | 'pending' | 'callStaff';
interface Props { onLogout: () => void; }
const tabs: { key: Tab; label: string; icon: string; description: string }[] = [
  { key: 'tables', label: 'Sơ đồ bàn', icon: '▦', description: 'Theo dõi không gian, mở hóa đơn và phục vụ khách.' },
  { key: 'pending', label: 'Duyệt đơn', icon: '≡', description: 'Kiểm tra món mới và chuyển yêu cầu xuống bếp.' },
  { key: 'callStaff', label: 'Gọi nhân viên', icon: '◉', description: 'Tiếp nhận và xử lý yêu cầu hỗ trợ từ các bàn.' },
];

export default function PosDashboard({ onLogout }: Props) {
  const username = localStorage.getItem('username') ?? 'Lễ tân';
  const [tab, setTab] = useState<Tab>('tables');
  const [pendingOrders, setPendingOrders] = useState<PendingOrder[]>([]);
  const [tables, setTables] = useState<TableOverview[]>([]);
  const [callStaffRequests, setCallStaffRequests] = useState<CallStaffRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [hasLoaded, setHasLoaded] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [selectedInvoiceId, setSelectedInvoiceId] = useState<number | null>(null);
  const [invoiceRefreshVersion, setInvoiceRefreshVersion] = useState(0);
  const [toast, setToast] = useState<{ tableId: number } | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const results = await Promise.allSettled([
        posApi.getPendingOrders(), posApi.getTableOverview(), posApi.getPendingCallStaffRequests(),
      ]);
      const [ordersResult, tableResult, callResult] = results;
      if (ordersResult.status === 'fulfilled') setPendingOrders(ordersResult.value);
      if (tableResult.status === 'fulfilled') setTables(tableResult.value);
      if (callResult.status === 'fulfilled') setCallStaffRequests(callResult.value);
      setLoadError(results.some(result => result.status === 'rejected')
        ? 'Chưa tải đủ dữ liệu. Thông tin bên dưới có thể chưa cập nhật.' : null);
    } finally {
      setHasLoaded(true);
      setLoading(false);
    }
  }, []);

  useEffect(() => { void refresh(); }, [refresh]);
  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(null), 6000);
    return () => window.clearTimeout(timer);
  }, [toast]);

  const connected = usePosSocket(() => {
    void refresh();
    setInvoiceRefreshVersion(version => version + 1);
  }, event => {
    if (event.type === 'CALL_STAFF') setToast({ tableId: event.tableId });
  });

  const pendingCount = pendingOrders.reduce((sum, order) => sum + order.items.length, 0);
  const servingCount = tables.filter(table => table.status === 'SERVING').length;
  const availableCount = tables.filter(table => table.status === 'AVAILABLE').length;
  const currentTab = tabs.find(item => item.key === tab)!;
  const countFor = (key: Tab) => key === 'pending' ? pendingCount : key === 'callStaff' ? callStaffRequests.length : null;
  const stat = (value: number) => hasLoaded ? value.toString().padStart(2, '0') : '—';

  return (
    <div className="pos-dashboard">
      <aside className="pos-sidebar" aria-label="Điều hướng quầy lễ tân">
        <a className="pos-brand" href="#" onClick={event => { event.preventDefault(); setTab('tables'); }}>
          <span className="pos-brand-mark" aria-hidden="true">S<span>·</span></span>
          <span>SMART POS<small>Không gian phục vụ</small></span>
        </a>
        <div className="pos-workspace-label">VẬN HÀNH NHÀ HÀNG</div>
        <nav className="pos-navigation">
          {tabs.map(item => (
            <button key={item.key} className={tab === item.key ? 'active' : ''}
              aria-current={tab === item.key ? 'page' : undefined} onClick={() => setTab(item.key)}>
              <span className="pos-nav-icon" aria-hidden="true">{item.icon}</span>
              <span>{item.label}</span>
              {(countFor(item.key) ?? 0) > 0 && <span className="pos-nav-count">{countFor(item.key)}</span>}
            </button>
          ))}
        </nav>
        <div className="pos-sidebar-note"><span aria-hidden="true">✦</span><strong>Một nhịp phục vụ tốt.</strong><p>Mọi bàn, mọi đơn, trong một không gian làm việc.</p></div>
        <div className="pos-user"><span className="pos-avatar">{username.slice(0, 1).toUpperCase()}</span><span><strong>{username}</strong><small>Lễ tân · Thu ngân</small></span></div>
        <button className="pos-logout" onClick={onLogout}>Đăng xuất <span aria-hidden="true">↗</span></button>
      </aside>

      <main className="pos-main">
        <header className="pos-topbar"><span>Quầy lễ tân <span className="pos-topbar-divider">/</span> <strong>{currentTab.label}</strong></span>
          <span className={`pos-connection ${connected ? 'is-connected' : ''}`}><i aria-hidden="true" />{connected ? 'Kết nối trực tiếp' : 'Đang kết nối lại'}</span>
        </header>
        <div className="pos-content">
          <div className="pos-page-heading"><div><p className="pos-eyebrow">SẴN SÀNG CHO MỘT LƯỢT PHỤC VỤ MỚI</p><h1>{currentTab.label}</h1><p>{currentTab.description}</p></div>
            <button className="pos-refresh" onClick={() => void refresh()} disabled={loading}><span aria-hidden="true">↻</span>{loading ? 'Đang cập nhật' : 'Làm mới dữ liệu'}</button>
          </div>

          <section className="pos-stats" aria-label="Tổng quan vận hành">
            <button onClick={() => setTab('tables')} className="pos-stat"><span className="pos-stat-label">Đang phục vụ <span className="pos-stat-symbol">↗</span></span><strong>{stat(servingCount)}<small>/ {hasLoaded ? tables.length : '—'} bàn</small></strong><span className="pos-stat-caption">Khách đang tại bàn</span></button>
            <button onClick={() => setTab('tables')} className="pos-stat"><span className="pos-stat-label">Bàn sẵn sàng <span className="pos-stat-dot" /></span><strong>{stat(availableCount)}<small>bàn</small></strong><span className="pos-stat-caption">Có thể đón khách mới</span></button>
            <button onClick={() => setTab('pending')} className={`pos-stat ${pendingCount ? 'needs-attention' : ''}`}><span className="pos-stat-label">Món chờ duyệt <span className="pos-stat-symbol">≡</span></span><strong>{stat(pendingCount)}<small>món</small></strong><span className="pos-stat-caption">{pendingOrders.length} đơn cần kiểm tra</span></button>
            <button onClick={() => setTab('callStaff')} className={`pos-stat ${callStaffRequests.length ? 'needs-attention' : ''}`}><span className="pos-stat-label">Yêu cầu hỗ trợ <span className="pos-stat-symbol">◉</span></span><strong>{stat(callStaffRequests.length)}<small>yêu cầu</small></strong><span className="pos-stat-caption">Từ các bàn đang phục vụ</span></button>
          </section>
          {loadError && <div className="pos-data-error" role="alert">{loadError}<button onClick={() => void refresh()} disabled={loading}>Thử lại</button></div>}

          <div className={`pos-workspace ${tab !== 'tables' ? 'single-column' : ''}`}>
            <section className="pos-surface" aria-busy={loading}>
              {!hasLoaded ? <div className="pos-skeleton" aria-label="Đang tải dữ liệu"><div /><div /><div /><div /><div /><div /></div> : <>
                {tab === 'tables' && <TableOverviewPanel tables={tables} onSelectInvoice={setSelectedInvoiceId} />}
                {tab === 'pending' && <><div className="pos-section-heading"><div><h2>Đơn mới cần kiểm tra</h2><p>Duyệt từng món để chuyển xuống đúng khu bếp.</p></div><span className="pos-soft-badge">{pendingOrders.length} đơn</span></div><PendingOrdersPanel orders={pendingOrders} onActionDone={refresh} /></>}
                {tab === 'callStaff' && <><div className="pos-section-heading"><div><h2>Khách cần hỗ trợ</h2><p>Xác nhận sau khi nhân viên đã tiếp nhận yêu cầu.</p></div><span className="pos-soft-badge">{callStaffRequests.length} yêu cầu</span></div><CallStaffPanel requests={callStaffRequests} onActionDone={refresh} /></>}
              </>}
            </section>
            {tab === 'tables' && <aside className="pos-activity-rail">
              <div className="pos-rail-heading"><h2>Cần chú ý</h2><span className="pos-soft-badge">{pendingOrders.length + callStaffRequests.length}</span></div>
              <div className="pos-rail-block"><div className="pos-rail-section-title"><h3>Đơn chờ duyệt</h3><button onClick={() => setTab('pending')}>Xem tất cả ↗</button></div>
                {pendingOrders.length === 0 ? <p className="pos-rail-empty">{hasLoaded ? 'Đã xử lý hết đơn chờ.' : 'Đang tải đơn chờ…'}</p> : pendingOrders.slice(0, 4).map(order => <button className="pos-activity-card" key={order.orderId} onClick={() => setTab('pending')}><span className="pos-activity-icon">≡</span><span><strong>Bàn {order.tableNumber}</strong><small>{order.floor} · {order.items.reduce((sum, item) => sum + item.quantity, 0)} phần cần duyệt</small></span><span aria-hidden="true">↗</span></button>)}
              </div>
              <div className="pos-rail-block"><div className="pos-rail-section-title"><h3>Gọi nhân viên</h3><button onClick={() => setTab('callStaff')}>Xem tất cả ↗</button></div>
                {callStaffRequests.length === 0 ? <p className="pos-rail-empty">{hasLoaded ? 'Chưa có yêu cầu hỗ trợ.' : 'Đang tải yêu cầu…'}</p> : callStaffRequests.slice(0, 3).map(request => <button className="pos-activity-card" key={request.requestId} onClick={() => setTab('callStaff')}><span className="pos-activity-icon support">◉</span><span><strong>Bàn {request.tableNumber}</strong><small>{request.floor} · Đang chờ nhân viên</small></span><span aria-hidden="true">↗</span></button>)}
              </div>
              <p className="pos-rail-footnote">Chọn bàn đang phục vụ để xem hóa đơn và thanh toán.</p>
            </aside>}
          </div>
          <footer className="pos-footer"><span>SMART POS & KDS</span><span>Dữ liệu được cập nhật từ hệ thống nhà hàng</span></footer>
        </div>
      </main>
      {toast && <button className="call-staff-toast" role="status" onClick={() => { setToast(null); setTab('callStaff'); }}>Bàn {tables.find(table => table.tableId === toast.tableId)?.tableNumber ?? toast.tableId} vừa gọi nhân viên <span>Tiếp nhận →</span></button>}
      {selectedInvoiceId !== null && <InvoiceDetailModal invoiceId={selectedInvoiceId} refreshVersion={invoiceRefreshVersion} onClose={() => setSelectedInvoiceId(null)} onChanged={refresh} />}
    </div>
  );
}