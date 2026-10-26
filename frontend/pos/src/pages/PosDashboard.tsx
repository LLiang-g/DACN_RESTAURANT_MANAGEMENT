import { useCallback, useEffect, useState } from 'react';
import { posApi } from '../api/posApi';
import type { PendingOrder, TableOverview } from '../types/pos';
import { usePosSocket } from '../hooks/usePosSocket';
import PendingOrdersPanel from '../components/PendingOrdersPanel';
import TableOverviewPanel from '../components/TableOverviewPanel';
import './PosDashboard.css';
import InvoiceDetailModal from '../components/InvoiceDetailModal';
type Tab = 'tables' | 'pending';

interface Props {
  onLogout: () => void;
}

export default function PosDashboard({ onLogout }: Props) {
  const [tab, setTab] = useState<Tab>('tables');
  const [pendingOrders, setPendingOrders] = useState<PendingOrder[]>([]);
  const [tables, setTables] = useState<TableOverview[]>([]);
  const [loading, setLoading] = useState(false);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const [orders, tableList] = await Promise.all([
        posApi.getPendingOrders(),
        posApi.getTableOverview(),
      ]);
      setPendingOrders(orders);
      setTables(tableList);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  usePosSocket(refresh);

  const pendingItemCount = pendingOrders.reduce((sum, o) => sum + o.items.length, 0);
  const [selectedInvoiceId, setSelectedInvoiceId] = useState<number | null>(null);
  return (
    <div className="pos-dashboard">
      <nav className="pos-tabs">
        <button className={tab === 'tables' ? 'active' : ''} onClick={() => setTab('tables')}>
          Sơ đồ bàn
        </button>
        <button className={tab === 'pending' ? 'active' : ''} onClick={() => setTab('pending')}>
          Duyệt đơn {pendingItemCount > 0 && <span className="badge">{pendingItemCount}</span>}
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