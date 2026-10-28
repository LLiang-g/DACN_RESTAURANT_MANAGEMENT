import { useState } from 'react';
import type { CallStaffRequest } from '../types/pos';
import { posApi } from '../api/posApi';

interface Props {
  requests: CallStaffRequest[];
  onActionDone: () => void;
}

function formatElapsed(createdAt: string): string {
  const diffMs = Date.now() - new Date(createdAt).getTime();
  const minutes = Math.max(0, Math.floor(diffMs / 60000));
  if (minutes < 1) return 'Vừa gọi';
  return `${minutes} phút trước`;
}

export default function CallStaffPanel({ requests, onActionDone }: Props) {
  const [processingId, setProcessingId] = useState<number | null>(null);

  const handleResolve = async (requestId: number) => {
    setProcessingId(requestId);
    try {
      await posApi.resolveCallStaffRequest(requestId);
      onActionDone();
    } catch {
      alert('Không xử lý được yêu cầu này, thử lại.');
    } finally {
      setProcessingId(null);
    }
  };

  if (requests.length === 0) {
    return <p className="empty-state">Không có yêu cầu gọi nhân viên nào.</p>;
  }

  return (
    <ul className="call-staff-list">
      {requests.map((r) => (
        <li key={r.requestId} className="call-staff-card">
          <div className="call-staff-info">
            <span className="call-staff-table">Bàn {r.tableNumber} — Tầng {r.floor}</span>
            <span className="call-staff-time">{formatElapsed(r.createdAt)}</span>
          </div>
          <button
            className="resolve-btn"
            disabled={processingId === r.requestId}
            onClick={() => handleResolve(r.requestId)}
          >
            Đã xử lý
          </button>
        </li>
      ))}
    </ul>
  );
}