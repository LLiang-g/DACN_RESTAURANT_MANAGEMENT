import { useEffect, useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import type { PaymentResponse } from '../types/pos';
interface Props {
  payment: PaymentResponse;
  busy: boolean;
  onMockConfirm: () => void;
  onBack: () => void;
  onRefresh: () => void;
}
export default function PaymentPanel({ payment, busy, onMockConfirm, onBack, onRefresh }: Props) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => { const id = window.setInterval(() => setNow(Date.now()), 1000); return () => window.clearInterval(id); }, []);
  const deadline = payment.expiresAt ? Date.parse(payment.expiresAt) : NaN;
  const remaining = Number.isFinite(deadline) ? Math.max(0, Math.ceil((deadline - now) / 1000)) : null;
  const elapsed = remaining === 0;
  const reconciling = payment.status === 'RECONCILING' || payment.status === 'EXPIRED';
  const minutes = remaining === null ? '' : String(Math.floor(remaining / 60)).padStart(2, '0');
  const seconds = remaining === null ? '' : String(remaining % 60).padStart(2, '0');
  return <div className={`payment-panel ${payment.status.toLowerCase()}`}>
    {(payment.status === 'PENDING' || reconciling) && <>
      <p className="payment-panel-title">{reconciling ? 'Đang đối soát với VNPay' : elapsed ? 'QR đã hết hạn — đang kiểm tra kết quả' : 'Đang chờ thanh toán'}</p>
      <div className="payment-panel-body">
        {payment.payUrl && !elapsed && !reconciling && <div className="payment-qr"><QRCodeSVG value={payment.payUrl} size={180} level="L" /></div>}
        <div className="payment-info">
          <p>Số tiền: <strong>{payment.amount.toLocaleString('vi-VN')}đ</strong></p>
          <p className="payment-panel-ref">Mã giao dịch: {payment.txnRef}</p>
          {remaining !== null && !elapsed && !reconciling && <p>Thời gian còn lại: <strong>{minutes}:{seconds}</strong></p>}
          {(elapsed || reconciling) && <p role="status">Hệ thống đang tự kiểm tra kết quả với VNPay. Nếu chưa có xác nhận rõ ràng, hóa đơn vẫn chờ đối soát và chưa thể thu lại tiền.</p>}
          {payment.provider === 'VNPAY' && !payment.payUrl && !reconciling && <p role="status">Giao dịch cũ chưa lưu link QR nên chưa thể mở lại. Cần đối soát giao dịch này; không tạo link mới thay thế.</p>}
          {payment.payUrl && !elapsed && !reconciling && <><p>Quét QR hoặc mở trang VNPay để thanh toán.</p><a href={payment.payUrl} target="_blank" rel="noreferrer">Mở trang thanh toán</a></>}
          <p>Bạn có thể đóng cửa sổ hóa đơn để xử lý bàn khác. Khi mở lại, hệ thống sẽ tải đúng giao dịch này.</p>
          <div className="payment-panel-actions">
            {payment.provider === 'MOCK' && <button className="pay-btn" onClick={onMockConfirm} disabled={busy}>Giả lập: tiền đã về</button>}
            <button onClick={onRefresh} disabled={busy}>Kiểm tra kết quả</button>
            <button onClick={onBack} disabled={busy}>Ẩn mã QR</button>
          </div>
        </div>
      </div>
    </>}
    {payment.status === 'SUCCESS' && <p className="payment-panel-title">Đã nhận thanh toán {payment.amount.toLocaleString('vi-VN')}đ</p>}
    {payment.status === 'FAILED' && <><p className="payment-panel-title">Thanh toán đã được xác nhận thất bại. Bạn có thể chọn phương thức khác.</p><button onClick={onBack}>Quay lại hóa đơn</button></>}
  </div>;
}
