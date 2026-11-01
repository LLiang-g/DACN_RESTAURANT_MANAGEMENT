import { QRCodeSVG } from 'qrcode.react';
import type { PaymentResponse } from '../types/pos';

interface Props {
  payment: PaymentResponse;
  busy: boolean;
  onMockConfirm: () => void;
  onBack: () => void;
}

export default function PaymentPanel({ payment, busy, onMockConfirm, onBack }: Props) {
  return (
    <div className={`payment-panel ${payment.status.toLowerCase()}`}>
        {payment.status === 'PENDING' && (
            <>
                <p className="payment-panel-title">⏳ Đang chờ thanh toán...</p>

                <div className="payment-panel-body">
                {payment.payUrl && (
                    <div className="payment-qr">
                    <QRCodeSVG value={payment.payUrl} size={180} level="L" />
                    </div>
                )}

                <div className="payment-info">
                    <p>Số tiền: <strong>{payment.amount.toLocaleString('vi-VN')}đ</strong></p>

                    {payment.payUrl && (
                    <>
                        <p className="payment-qr-hint">Quét mã để thanh toán qua VNPay</p>
                        <a href={payment.payUrl} target="_blank" rel="noreferrer">Hoặc mở trang thanh toán</a>
                    </>
                    )}

                    {/* Mã tham chiếu chỉ để nhân viên đối soát khi thử nghiệm */}
                    {payment.provider === 'MOCK' && (
                    <p className="payment-panel-ref">Mã tham chiếu: {payment.txnRef}</p>
                    )}

                    <div className="payment-panel-actions">
                    {payment.provider === 'MOCK' && (
                        <button className="pay-btn" onClick={onMockConfirm} disabled={busy}>
                        Giả lập: tiền đã về
                        </button>
                    )}
                    <button onClick={onBack} disabled={busy}>Đổi cách thanh toán</button>
                    </div>
                </div>
                </div>
            </>
        )}

      {payment.status === 'SUCCESS' && (
        <p className="payment-panel-title">✅ Đã nhận thanh toán {payment.amount.toLocaleString('vi-VN')}đ</p>
      )}

      {(payment.status === 'FAILED' || payment.status === 'EXPIRED') && (
        <>
          <p className="payment-panel-title">
            ❌ {payment.status === 'FAILED' ? 'Thanh toán thất bại' : 'Giao dịch đã hết hạn'}
          </p>
          <button onClick={onBack}>Thử lại</button>
        </>
      )}
    </div>
  );
}