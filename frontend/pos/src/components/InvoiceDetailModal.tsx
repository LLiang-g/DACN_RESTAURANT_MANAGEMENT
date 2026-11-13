import { useEffect, useState } from 'react';
import type { InvoiceDetail } from '../types/pos';
import { posApi } from '../api/posApi';
import InvoiceReceipt, { receiptError } from './InvoiceReceipt';
import { flushSync } from 'react-dom';
import CollectionWorkspace from './CollectionWorkspace';

interface Props {
  invoiceId: number;
  refreshVersion?: number;
  onClose: () => void;
  onChanged: () => void;
}

const statusLabels: Record<string, string> = {
  PENDING: 'Chờ duyệt', CONFIRMED: 'Chờ bếp', COOKING: 'Đang nấu',
  DONE: 'Đã xong', SERVED: 'Đã phục vụ', REJECTED: 'Đã hủy / Từ chối', RETURNED: 'Đã trả',
};
export default function InvoiceDetailModal({ invoiceId, refreshVersion = 0, onClose, onChanged }: Props) {
  const [invoice, setInvoice] = useState<InvoiceDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [printing, setPrinting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [processingItemId, setProcessingItemId] = useState<number | null>(null);

  const [paymentBusy, setPaymentBusy] = useState(false);
  // State cho popup nhập lý do trả món ở giữa màn hình
  const [returningItemId, setReturningItemId] = useState<number | null>(null);
  const [returnReason, setReturnReason] = useState('');

  const loadInvoice = () => {
    setLoading(true);
    return posApi.getInvoiceDetail(invoiceId)
      .then(setInvoice)
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    let active = true;
    // Background refresh preserves payment and return forms while the invoice is open.
    posApi.getInvoiceDetail(invoiceId)
      .then((latest) => {
        if (active) setInvoice(latest);
      })
      .catch((err) => {
        if (active) setError(err?.response?.data?.message ?? 'Không tải được hóa đơn.');
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => { active = false; };
  }, [invoiceId, refreshVersion]);

  const handlePrint = async () => {
    if (printing) return;
    setPrinting(true);
    setError(null);
    try {
      const latest = await posApi.getInvoiceDetail(invoiceId);
      flushSync(() => setInvoice(latest));
      const problem = receiptError(latest);
      if (problem) { setError(problem); return; }
      window.print();
    } catch { setError('Không tải được dữ liệu mới nhất để in. Vui lòng thử lại.'); }
    finally { setPrinting(false); }
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

  // Mở popup nhập lý do trả món
  const openReturnModal = (orderItemId: number) => {
    setError(null);
    setReturningItemId(orderItemId);
    setReturnReason('');
  };

  // Xác nhận trả món kèm lý do
  const handleConfirmReturn = async () => {
    if (returningItemId === null) return;
    if (!returnReason.trim()) {
      setError('Vui lòng nhập lý do trả món.');
      return;
    }

    setError(null);
    setProcessingItemId(returningItemId);
    try {
      await posApi.markReturned(returningItemId, returnReason.trim());
      setReturningItemId(null);
      setReturnReason('');
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
      await loadInvoice();
      onChanged();
    } catch (err: any) {
      setError(err?.response?.data?.message ?? 'Không hoàn tác được.');
    } finally {
      setProcessingItemId(null);
    }
  };

  const hasPending =
    invoice?.items.some((i) => i.status === 'PENDING') ||
    invoice?.combos.some((c) => c.items.some((i) => i.status === 'PENDING'));


  // MỚI: đang chờ tiền về thì khóa các thao tác có thể làm đổi hóa đơn
  const waitingPayment = paymentBusy || !!invoice?.collection?.entries.some(e => e.status !== 'VOID');

  return (
    <div className="modal-backdrop" onClick={() => { if (!paymentBusy && !printing) onClose(); }}>
      <div className="modal invoice-modal" onClick={(e) => e.stopPropagation()}>
        {loading && <p>Đang tải...</p>}

        {invoice && (
          <>
            <h4>Hóa đơn — Bàn {invoice.tableNumber} ( {invoice.floor})</h4>

            <ul className="invoice-items">
              {invoice.items.map((item) => (
                <li key={`item-${item.orderItemId}`}>
                  <span>{item.foodName} x{item.quantity}</span>
                  <span className={`item-status ${item.status.toLowerCase()}`}>{statusLabels[item.status] ?? item.status}</span>
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

                  {item.status === 'SERVED' && invoice.status === 'OPEN' && (
                    <button
                      className="return-btn"
                      disabled={processingItemId === item.orderItemId || waitingPayment}
                      onClick={() => openReturnModal(item.orderItemId)}
                    >
                      Trả món
                    </button>
                  )}

                  {item.status === 'RETURNED' && invoice.status === 'OPEN' &&  (
                    <button
                      className="undo-return-btn"
                      disabled={processingItemId === item.orderItemId || waitingPayment}
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
                        <span className={`item-status ${ci.status.toLowerCase()}`}>{statusLabels[ci.status] ?? ci.status}</span>

                        {ci.status === 'DONE' && (
                          <button
                            className="serve-btn"
                            disabled={processingItemId === ci.orderItemId}
                            onClick={() => handleMarkServed(ci.orderItemId)}
                          >
                            Phục vụ
                          </button>
                        )}
                        {ci.status === 'SERVED' && invoice.status === 'OPEN' &&  (
                          <button
                            className="return-btn"
                            disabled={processingItemId === ci.orderItemId || waitingPayment}
                            onClick={() => openReturnModal(ci.orderItemId)}
                          >
                            Trả món
                          </button>
                        )}
                        {ci.status === 'RETURNED' && invoice.status === 'OPEN' &&  (
                          <button
                            className="undo-return-btn"
                            disabled={processingItemId === ci.orderItemId || waitingPayment}
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

            <CollectionWorkspace invoiceId={invoiceId} blocked={hasPending || submitting || printing} onBusy={setPaymentBusy} onChanged={() => { void loadInvoice().catch(() => setError('Đã ghi nhận nhưng chưa tải được hóa đơn. Không thu lại tiền.')); onChanged(); }} />
            {error && <p className="login-error">{error}</p>}

            <div className="modal-actions">
              <button className="free-table-btn" onClick={handleFreeTable} disabled={submitting || paymentBusy || invoice.status === 'OPEN'}>
                Đưa bàn về Trống
              </button>
              <button onClick={onClose} disabled={submitting || paymentBusy || printing}>Đóng</button>

              {invoice.status !== 'CANCELLED' && <button className="print-btn" onClick={handlePrint} disabled={submitting || paymentBusy || printing || processingItemId !== null || hasPending} title={hasPending ? 'Duyệt hoặc từ chối hết món trước khi in' : undefined}>
                {printing ? 'Đang chuẩn bị in…' : invoice.status === 'PAID' ? 'In hóa đơn' : 'In phiếu tạm tính'}
              </button>}

              {invoice.status === 'OPEN' && (
                <>
                  <button
                    className="cancel-invoice-btn"
                    onClick={handleCancelInvoice}
                    disabled={submitting || waitingPayment}
                  >
                    Hủy hóa đơn
                  </button>


                </>
              )}
            </div>
            <InvoiceReceipt invoice={invoice} />
          </>
        )}

        {/* Modal con hiển thị ô input nhập lý do trả món ngay giữa màn hình */}
        {returningItemId !== null && (
          <div
            className="modal-backdrop"
            style={{ zIndex: 1100 }}
            onClick={() => setReturningItemId(null)}
          >
            <div
              className="modal return-reason-modal"
              style={{ maxWidth: '400px', width: '90%', padding: '20px' }}
              onClick={(e) => e.stopPropagation()}
            >
              <h4>Nhập lý do trả món</h4>
              <input
                type="text"
                placeholder="VD: Khách đổi ý, món làm nguội..."
                value={returnReason}
                onChange={(e) => setReturnReason(e.target.value)}
                autoFocus
                style={{ width: '100%', padding: '8px', marginTop: '10px', marginBottom: '16px', boxSizing: 'border-box' }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleConfirmReturn();
                }}
              />
              <div className="modal-actions" style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                <button
                  onClick={() => setReturningItemId(null)}
                  disabled={processingItemId === returningItemId}
                >
                  Hủy
                </button>
                <button
                  className="return-btn"
                  onClick={handleConfirmReturn}
                  disabled={!returnReason.trim() || processingItemId === returningItemId}
                >
                  Xác nhận trả món
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}