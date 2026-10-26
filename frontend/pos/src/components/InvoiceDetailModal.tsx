import { useEffect, useState } from 'react';
import type { InvoiceDetail, PaymentMethod } from '../types/pos';
import { posApi } from '../api/posApi';

interface Props {
  invoiceId: number;
  onClose: () => void;
  onChanged: () => void;
}

export default function InvoiceDetailModal({ invoiceId, onClose, onChanged }: Props) {
  const [invoice, setInvoice] = useState<InvoiceDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [method, setMethod] = useState<PaymentMethod>('CASH');
  const [amountReceived, setAmountReceived] = useState('');
  const [bankRef, setBankRef] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    setLoading(true);
    posApi.getInvoiceDetail(invoiceId)
      .then(setInvoice)
      .finally(() => setLoading(false));
  }, [invoiceId]);

  const handlePay = async () => {
    setError(null);
    setSubmitting(true);
    try {
      await posApi.payInvoice(invoiceId, {
        paymentMethod: method,
        amountReceived: method === 'CASH' ? Number(amountReceived) : undefined,
        bankTransactionRef: method === 'BANK_TRANSFER' ? bankRef : undefined,
      });
      onChanged();
      onClose();
    } catch (err: any) {
      setError(err?.response?.data?.message ?? 'Thanh toán thất bại.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleCancelInvoice = async () => {
    if (!confirm('Xác nhận hủy hóa đơn này?')) return;
    setSubmitting(true);
    try {
      await posApi.cancelInvoice(invoiceId);
      onChanged();
      onClose();
    } catch (err: any) {
      setError(err?.response?.data?.message ?? 'Hủy hóa đơn thất bại.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleFreeTable = async () => {
    if (!invoice) return;
    if (!confirm(`Xác nhận đưa bàn ${invoice.tableNumber} về Trống?`)) return;
    setError(null);
    setSubmitting(true);
    try {
      await posApi.freeTable(invoice.tableId);
      onChanged();
      onClose();
    } catch (err: any) {
      // Lỗi mong đợi nhất ở đây: TABLE_HAS_OPEN_INVOICE (hóa đơn còn OPEN, backend chặn)
      setError(err?.response?.data?.message ?? 'Không thể đưa bàn về Trống.');
    } finally {
      setSubmitting(false);
    }
  };

  // Không còn dùng để khóa nút Thanh toán nữa — chỉ còn tác dụng hiển thị
  // dòng thông tin nhắc lễ tân biết vẫn còn món chưa xong, không chặn thao tác.
  const hasUnsettled = invoice?.items.some((i) =>
    ['PENDING', 'CONFIRMED', 'COOKING', 'DONE'].includes(i.status)
  );

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal invoice-modal" onClick={(e) => e.stopPropagation()}>
        {loading && <p>Đang tải...</p>}

        {invoice && (
          <>
            <h4>Hóa đơn — Bàn {invoice.tableNumber} (Tầng {invoice.floor})</h4>

            <ul className="invoice-items">
              {invoice.items.map((item) => (
                <li key={item.orderItemId}>
                  <span>{item.foodName} x{item.quantity}</span>
                  <span className={`item-status ${item.status.toLowerCase()}`}>{item.status}</span>
                  <span>{item.lineTotal.toLocaleString('vi-VN')}đ</span>
                </li>
              ))}
            </ul>

            <div className="invoice-total">
              Tổng cộng: <strong>{invoice.totalAmount.toLocaleString('vi-VN')}đ</strong>
            </div>

            {invoice.status === 'OPEN' && (
              <>
                {hasUnsettled && (
                  <p className="invoice-warning">
                    Vẫn còn món chưa phục vụ xong — bàn sẽ tự về Trống khi tất cả món hoàn tất.
                  </p>
                )}

                <div className="payment-form">
                  <label>
                    <input type="radio" checked={method === 'CASH'} onChange={() => setMethod('CASH')} />
                    Tiền mặt
                  </label>
                  <label>
                    <input type="radio" checked={method === 'BANK_TRANSFER'} onChange={() => setMethod('BANK_TRANSFER')} />
                    VietQR
                  </label>

                  {method === 'CASH' ? (
                    <input
                      type="number"
                      placeholder="Số tiền khách đưa"
                      value={amountReceived}
                      onChange={(e) => setAmountReceived(e.target.value)}
                    />
                  ) : (
                    <input
                      placeholder="Mã giao dịch"
                      value={bankRef}
                      onChange={(e) => setBankRef(e.target.value)}
                    />
                  )}
                </div>
              </>
            )}

            {error && <p className="login-error">{error}</p>}

            <div className="modal-actions">
              <button className="free-table-btn" onClick={handleFreeTable} disabled={submitting}>
                Đưa bàn về Trống
              </button>
              <button onClick={onClose} disabled={submitting}>Đóng</button>

              {invoice.status === 'OPEN' && (
                <>
                  <button className="cancel-invoice-btn" onClick={handleCancelInvoice} disabled={submitting}>
                    Hủy hóa đơn
                  </button>
                  <button className="pay-btn" onClick={handlePay} disabled={submitting}>
                    Thanh toán
                  </button>
                </>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}