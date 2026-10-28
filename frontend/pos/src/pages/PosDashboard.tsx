import { useCallback, useEffect, useState } from 'react';
import { posApi } from '../api/posApi';
import type { PendingOrder, TableOverview, CallStaffRequest } from '../types/pos';
import { usePosSocket } from '../hooks/usePosSocket';
import PendingOrdersPanel from '../components/PendingOrdersPanel';
import TableOverviewPanel from '../components/TableOverviewPanel';
import CallStaffPanel from '../components/CallStaffPanel';
import './PosDashboard.css';
import InvoiceDetailModal from '../components/InvoiceDetailModal';
type Tab = 'tables' | 'pending' | 'callStaff';

interface Props {
  onLogout: () => void;
}

export default function PosDashboard({ onLogout }: Props) {
  const [tab, setTab] = useState<Tab>('tables');
  const [pendingOrders, setPendingOrders] = useState<PendingOrder[]>([]);
  const [tables, setTables] = useState<TableOverview[]>([]);
  const [callStaffRequests, setCallStaffRequests] = useState<CallStaffRequest[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedInvoiceId, setSelectedInvoiceId] = useState<number | null>(null);
  const [toast, setToast] = useState<{ tableId: number } | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const [ordersResult, tableResult, callStaffResult] = await Promise.allSettled([
        posApi.getPendingOrders(),
        posApi.getTableOverview(),
        posApi.getPendingCallStaffRequests(),
      ]);

      if (ordersResult.status === 'fulfilled') {
        setPendingOrders(ordersResult.value);
      } else {
        console.error('Lỗi tải đơn chờ duyệt:', ordersResult.reason);
      }

      if (tableResult.status === 'fulfilled') {
        setTables(tableResult.value);
      } else {
        console.error('Lỗi tải sơ đồ bàn:', tableResult.reason);
      }

      if (callStaffResult.status === 'fulfilled') {
        setCallStaffRequests(callStaffResult.value);
      } else {
        console.error('Lỗi tải yêu cầu gọi nhân viên:', callStaffResult.reason);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  // Toast tự ẩn sau 6 giây kể từ lần set gần nhất
  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(null), 6000);
    return () => clearTimeout(timer);
  }, [toast]);

  usePosSocket(refresh, (event) => {
    if (event.type === 'CALL_STAFF') {
      setToast({ tableId: event.tableId });
    }
  });

  const pendingItemCount = pendingOrders.reduce((sum, o) => sum + o.items.length, 0);

  return (
    <div className="pos-dashboard">
      {toast && (() => {
        const table = tables.find((t) => t.tableId === toast.tableId);
        return (
          <div className="call-staff-toast" onClick={() => setToast(null)}>
            🔔 Bàn {table?.tableNumber ?? toast.tableId}
            {table ? ` — Tầng ${table.floor}` : ''} vừa gọi nhân viên!
          </div>
        );
      })()}

      <nav className="pos-tabs">
        <button className={tab === 'tables' ? 'active' : ''} onClick={() => setTab('tables')}>
          Sơ đồ bàn
        </button>
        <button className={tab === 'pending' ? 'active' : ''} onClick={() => setTab('pending')}>
          Duyệt đơn {pendingItemCount > 0 && <span className="badge">{pendingItemCount}</span>}
        </button>
        <button className={tab === 'callStaff' ? 'active' : ''} onClick={() => setTab('callStaff')}>
          Gọi nhân viên {callStaffRequests.length > 0 && <span className="badge urgent">{callStaffRequests.length}</span>}
        </button>
        <button className="logout-btn" onClick={onLogout}>
          Đăng xuất
        </button>
      </nav>

      {loading && <p>Đang tải...</p>}

      {tab === 'tables' && (
        <TableOverviewPanel tables={tables} onSelectInvoice={setSelectedInvoiceId} />
      )}

      {tab === 'pending' && <PendingOrdersPanel orders={pendingOrders} onActionDone={refresh} />}

      {tab === 'callStaff' && <CallStaffPanel requests={callStaffRequests} onActionDone={refresh} />}

      {selectedInvoiceId !== null && (
        <InvoiceDetailModal
          invoiceId={selectedInvoiceId}
          onClose={() => setSelectedInvoiceId(null)}
          onChanged={refresh}
        />
      )}
    </div>
  );
}