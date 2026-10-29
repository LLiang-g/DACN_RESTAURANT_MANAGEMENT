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
  const [processingItemId, setProcessingItemId] = useState<number | null>(null);

  const loadInvoice = () => {
    setLoading(true);
    return posApi.getInvoiceDetail(invoiceId)
      .then(setInvoice)
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadInvoice();
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
  const handleMarkServed = async (orderItemId: number) => {
  setError(null);
  setProcessingItemId(orderItemId);
  try {
    await posApi.markServed(orderItemId);
    await loadInvoice();
    onChanged();
  } catch (err: any) {
    setError(err?.response?.data?.message ?? 'Không đánh dấu phục vụ được.');
  } finally {
    setProcessingItemId(null);
  }
};

const handleMarkReturned = async (orderItemId: number) => {
  if (!confirm('Xác nhận trả món này (khách không dùng nữa)?')) return;
  setError(null);
  setProcessingItemId(orderItemId);
  try {
    await posApi.markReturned(orderItemId);
    await loadInvoice();
    onChanged();
  } catch (err: any) {
    setError(err?.response?.data?.message ?? 'Không trả món được.');
  } finally {
    setProcessingItemId(null);
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
      setError(err?.response?.data?.message ?? 'Không thể đưa bàn về Trống.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleUndoReturn = async (orderItemId: number) => {
    setError(null);
    setProcessingItemId(orderItemId);
    try {
      await posApi.undoReturnItem(orderItemId);
      await loadInvoice(); // tải lại để thấy trạng thái/tổng tiền mới, KHÔNG đóng modal
      onChanged(); // đồng thời báo PosDashboard refresh danh sách bàn/đơn
    } catch (err: any) {
      setError(err?.response?.data?.message ?? 'Không hoàn tác được.');
    } finally {
      setProcessingItemId(null);
    }
  };

  const hasPending =
    invoice?.items.some((i) => i.status === 'PENDING') ||
    invoice?.combos.some((c) => c.items.some((i) => i.status === 'PENDING'));

  const hasUnservedApproved =
    invoice?.items.some((i) => ['CONFIRMED', 'COOKING', 'DONE'].includes(i.status)) ||
    invoice?.combos.some((c) => c.items.some((i) => ['CONFIRMED', 'COOKING', 'DONE'].includes(i.status)));

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal invoice-modal" onClick={(e) => e.stopPropagation()}>
        {loading && <p>Đang tải...</p>}

        {invoice && (
          <>
            <h4>Hóa đơn — Bàn {invoice.tableNumber} (Tầng {invoice.floor})</h4>

            <ul className="invoice-items">
              {invoice.items.map((item) => (
                <li key={`item-${item.orderItemId}`}>
                  <span>{item.foodName} x{item.quantity}</span>
                  <span className={`item-status ${item.status.toLowerCase()}`}>{item.status}</span>
                  <span>{item.lineTotal.toLocaleString('vi-VN')}đ</span>

                  {item.status === 'DONE' && (
                    <button
                      className="serve-btn"
                      disabled={processingItemId === item.orderItemId}
                      onClick={() => handleMarkServed(item.orderItemId)}
                    >
                      Phục vụ
                    </button>
                  )}

                  {item.status === 'SERVED' && (
                    <button
                      className="return-btn"
                      disabled={processingItemId === item.orderItemId}
                      onClick={() => handleMarkReturned(item.orderItemId)}
                    >
                      Trả món
                    </button>
                  )}

                  {item.status === 'RETURNED' && (
                    <button
                      className="undo-return-btn"
                      disabled={processingItemId === item.orderItemId}
                      onClick={() => handleUndoReturn(item.orderItemId)}
                    >
                      Hoàn tác
                    </button>
                  )}
                </li>
              ))}

              {invoice.combos.map((combo) => (
                <li key={`combo-${combo.orderComboId}`} className="invoice-combo-line">
                  <div className="invoice-combo-header">
                    <span>{combo.comboName} x{combo.quantity} <em>(combo)</em></span>
                    <span>{combo.lineTotal.toLocaleString('vi-VN')}đ</span>
                  </div>
                  <ul className="invoice-combo-items">
                    {combo.items.map((ci) => (
                      <li key={ci.orderItemId}>
                        <span>— {ci.foodName} x{ci.quantity}</span>
                        <span className={`item-status ${ci.status.toLowerCase()}`}>{ci.status}</span>

                        {ci.status === 'DONE' && (
                          <button
                            className="serve-btn"
                            disabled={processingItemId === ci.orderItemId}
                            onClick={() => handleMarkServed(ci.orderItemId)}
                          >
                            Phục vụ
                          </button>
                        )}
                        {ci.status === 'SERVED' && (
                          <button
                            className="return-btn"
                            disabled={processingItemId === ci.orderItemId}
                            onClick={() => handleMarkReturned(ci.orderItemId)}
                          >
                            Trả món
                          </button>
                        )}
                        {ci.status === 'RETURNED' && (
                          <button
                            className="undo-return-btn"
                            disabled={processingItemId === ci.orderItemId}
                            onClick={() => handleUndoReturn(ci.orderItemId)}
                          >
                            Hoàn tác
                          </button>
                        )}
                      </li>
                    ))}
                  </ul>
                </li>
              ))}
            </ul>

            <div className="invoice-total">
              Tổng cộng: <strong>{invoice.totalAmount.toLocaleString('vi-VN')}đ</strong>
            </div>

            {invoice.status === 'OPEN' && (
              <>
                {hasPending && (
                  <p className="invoice-warning">
                    Còn món chưa được duyệt — phải duyệt hoặc từ chối trước khi thanh toán.
                  </p>
                )}
                {!hasPending && hasUnservedApproved && (
                  <p className="invoice-warning">
                    Vẫn còn món chưa phục vụ xong 
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
                  <button className="pay-btn" onClick={handlePay} disabled={submitting || hasPending}>
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