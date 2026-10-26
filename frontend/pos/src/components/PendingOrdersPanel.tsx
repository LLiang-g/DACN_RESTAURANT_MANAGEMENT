import { useState } from 'react';
import type { PendingOrder } from '../types/pos';
import { posApi } from '../api/posApi';

interface Props {
  orders: PendingOrder[];
  onActionDone: () => void;
}
function getUrgencyClass(createdAt: string): string {
  const minutesWaiting = (Date.now() - new Date(createdAt).getTime()) / 60000;
  if (minutesWaiting >= 10) return 'urgent';
  if (minutesWaiting >= 5) return 'warm';
  return '';
}
export default function PendingOrdersPanel({ orders, onActionDone }: Props) {
  const [processingId, setProcessingId] = useState<number | null>(null);
  const [rejectTarget, setRejectTarget] = useState<number | null>(null);
  const [reason, setReason] = useState('');

  const handleApprove = async (orderItemId: number) => {
    setProcessingId(orderItemId);
    try {
      await posApi.approveItem(orderItemId);
      onActionDone();
    } catch {
      alert('Duyệt món thất bại — có thể món đã được xử lý trước đó.');
    } finally {
      setProcessingId(null);
    }
  };

  const confirmReject = async () => {
    if (!reason.trim() || rejectTarget === null) return;
    setProcessingId(rejectTarget);
    try {
      await posApi.rejectItem(rejectTarget, reason.trim());
      setRejectTarget(null);
    } catch {
      alert('Từ chối món thất bại.');
    } finally {
      setProcessingId(null);
      onActionDone();
    }
  };

  if (orders.length === 0) {
    return <p>Không có đơn nào đang chờ duyệt.</p>;
  }

  return (
    <div className="pending-orders">
      {orders.map((order) => (
        <div key={order.orderId} className={`order-card ${getUrgencyClass(order.createdAt)}`}>
          <header>
            Bàn {order.tableNumber} — Tầng {order.floor}
            <time>{new Date(order.createdAt).toLocaleTimeString('vi-VN')}</time>
          </header>
          <ul>
            {order.items.map((item) => (
              <li key={item.orderItemId}>
                <div>
                  <strong>{item.foodName}</strong> x{item.quantity}
                  {item.options.length > 0 && (
                    <div className="options">{item.options.join(', ')}</div>
                  )}
                  {item.note && <div className="note">Ghi chú: {item.note}</div>}
                </div>
                <div className="actions">
                  <button
                    disabled={processingId === item.orderItemId}
                    onClick={() => handleApprove(item.orderItemId)}
                  >
                    ✓ Duyệt
                  </button>
                  <button
                    disabled={processingId === item.orderItemId}
                    onClick={() => {
                      setRejectTarget(item.orderItemId);
                      setReason('');
                    }}
                  >
                    ✕ Từ chối
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </div>
      ))}

      {rejectTarget !== null && (
        <div className="modal-backdrop">
          <div className="modal">
            <h4>Lý do từ chối món</h4>
            <textarea value={reason} onChange={(e) => setReason(e.target.value)} rows={3} />
            <div className="modal-actions">
              <button onClick={() => setRejectTarget(null)}>Hủy</button>
              <button disabled={!reason.trim()} onClick={confirmReject}>
                Xác nhận từ chối
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}