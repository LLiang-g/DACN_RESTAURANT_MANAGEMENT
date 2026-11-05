import { useEffect, useState } from 'react';
import type { InvoiceDetail, PaymentMethod, PaymentResponse,PaymentProviderType } from '../types/pos';
import { posApi } from '../api/posApi';
import InvoiceReceipt from './InvoiceReceipt';
import PaymentPanel from './PaymentPanel';

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
  const [method, setMethod] = useState<PaymentMethod>('CASH');
  const [provider, setProvider] = useState<PaymentProviderType>('VNPAY');
  const [amountReceived, setAmountReceived] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [processingItemId, setProcessingItemId] = useState<number | null>(null);

  // MỚI: giao dịch thanh toán online đang theo dõi
  const [payment, setPayment] = useState<PaymentResponse | null>(null);
  const [paymentBusy, setPaymentBusy] = useState(false);
  const [paymentReady, setPaymentReady] = useState(false);
  const [showPayment, setShowPayment] = useState(true);
  const [recoveryVersion, setRecoveryVersion] = useState(0);

  useEffect(() => {
    let active = true;
    setPaymentReady(false);
    setPayment(null);
    posApi.getPendingPayment(invoiceId).then((pending) => {
      if (!active) return;
      setPayment(pending);
      setShowPayment(true);
      if (pending) { setMethod('BANK_TRANSFER'); setProvider(pending.provider); }
      setPaymentReady(true);
    }).catch(() => {
      if (active) setError('Không kiểm tra được giao dịch đang chờ. Hãy thử tải lại trước khi thanh toán.');
    });
    return () => { active = false; };
  }, [invoiceId, recoveryVersion]);

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

  // MỚI: hỏi server trạng thái giao dịch; nếu đã SUCCESS thì tải lại hóa đơn (lúc này là PAID)
  const syncPaymentStatus = async (txnRef: string, reconcile = false) => {
    const latest = reconcile && payment?.provider === 'VNPAY'
      ? await posApi.reconcilePayment(txnRef) : await posApi.getPayment(txnRef);
    // Chỉ ghép trạng thái mới vào, giữ nguyên payUrl vì API GET không trả payUrl
    setPayment((prev) => (prev && prev.txnRef === txnRef ? { ...prev, ...latest } : prev));
    if (latest.status === 'SUCCESS') {
      await loadInvoice();
      onChanged();
    }
  };

  // MỚI: polling 2 giây/lần khi đang chờ
  useEffect(() => {
    if (!payment || !['PENDING', 'RECONCILING', 'EXPIRED'].includes(payment.status)) return;
    const timer = setInterval(() => {
      syncPaymentStatus(payment.txnRef).catch(() => {
        // Lỗi mạng tạm thời: bỏ qua, lần poll sau sẽ thử lại
      });
    }, 2000);
    return () => clearInterval(timer);
  }, [payment?.txnRef, payment?.status]);

  const handlePay = async () => {
    setError(null);
    setSubmitting(true);
    try {
      // Chỉ còn tiền mặt đi qua đường này; chuyển khoản đi qua cổng online
      await posApi.payInvoice(invoiceId, {
        paymentMethod: 'CASH',
        amountReceived: Number(amountReceived),
      });
      onChanged();
      onClose();
    } catch (err: any) {
      setError(err?.response?.data?.message ?? 'Thanh toán thất bại.');
    } finally {
      setSubmitting(false);
    }
  };

  // MỚI
  const handleCreatePayment = async () => {
    setError(null);
    setPaymentBusy(true);
    try {
      const created = await posApi.createPayment(invoiceId, provider);// k mock nữa
      setPayment(created);
      setMethod('BANK_TRANSFER');
      setShowPayment(true);
    } catch (err: any) {
      setError(err?.response?.data?.message ?? 'Không tạo được giao dịch thanh toán.');
    } finally {
      setPaymentBusy(false);
    }
  };

  // MỚI: nút giả lập tiền về (chỉ dùng khi demo, provider MOCK)
  const handleMockConfirm = async () => {
    if (!payment) return;
    setError(null);
    setPaymentBusy(true);
    try {
      await posApi.mockConfirmPayment(payment.txnRef);
      await syncPaymentStatus(payment.txnRef);
    } catch (err: any) {
      setError(err?.response?.data?.message ?? 'Giả lập thanh toán thất bại.');
    } finally {
      setPaymentBusy(false);
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

  const hasUnservedApproved =
    invoice?.items.some((i) => ['CONFIRMED', 'COOKING', 'DONE'].includes(i.status)) ||
    invoice?.combos.some((c) => c.items.some((i) => ['CONFIRMED', 'COOKING', 'DONE'].includes(i.status)));

  // MỚI: đang chờ tiền về thì khóa các thao tác có thể làm đổi hóa đơn
  const waitingPayment = !paymentReady || paymentBusy || !!payment && ['PENDING', 'RECONCILING', 'EXPIRED'].includes(payment.status);

  return (
    <div className="modal-backdrop" onClick={() => { if (!paymentBusy) onClose(); }}>
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
                    <input
                      type="radio"
                      checked={method === 'CASH'}
                      disabled={waitingPayment}
                      onChange={() => setMethod('CASH')}
                    />
                    Tiền mặt
                  </label>
                  <label>
                    <input
                      type="radio"
                      checked={method === 'BANK_TRANSFER'}
                      disabled={waitingPayment}
                      onChange={() => setMethod('BANK_TRANSFER')}
                    />
                    Chuyển khoản / QR
                  </label>
                  {method === 'BANK_TRANSFER' && (
                    <div className="provider-choice">
                      <label>
                        <input type="radio" checked={provider === 'VNPAY'} disabled={waitingPayment}
                              onChange={() => setProvider('VNPAY')} />
                        VNPay (quét QR)
                      </label>
                      
                    </div>
                  )}

                  {method === 'CASH' && (
                    <input
                      type="number"
                      placeholder="Số tiền khách đưa"
                      value={amountReceived}
                      onChange={(e) => setAmountReceived(e.target.value)}
                    />
                  )}
                </div>
              </>
            )}

            {/* MỚI: màn hình chờ / kết quả thanh toán online */}
            {payment && showPayment && (
              <PaymentPanel
                payment={payment}
                busy={paymentBusy}
                onMockConfirm={handleMockConfirm}
                onRefresh={() => {
                  if (!payment || paymentBusy) return;
                  setPaymentBusy(true);
                  void syncPaymentStatus(payment.txnRef, true)
                    .catch(() => setError('Chưa kiểm tra được kết quả. Hệ thống vẫn giữ giao dịch để đối soát.'))
                    .finally(() => setPaymentBusy(false));
                }}
                onBack={() => {
                  if (['PENDING', 'RECONCILING', 'EXPIRED'].includes(payment.status)) setShowPayment(false);
                  else { setPayment(null); setRecoveryVersion(v => v + 1); }
                }}
              />
            )}

            {!paymentReady && <p role="status">Đang kiểm tra giao dịch thanh toán… <button onClick={() => setRecoveryVersion(v => v + 1)}>Kiểm tra lại</button></p>}
            {payment && ['PENDING', 'RECONCILING', 'EXPIRED'].includes(payment.status) && !showPayment && <div className="payment-panel pending"><p>Hóa đơn vẫn đang chờ thanh toán online. Bạn có thể đóng cửa sổ để xử lý bàn khác.</p><button className="pay-btn" onClick={() => setShowPayment(true)}>Mở lại mã QR đang chờ</button></div>}
            {error && <p className="login-error">{error}</p>}

            <div className="modal-actions">
              <button className="free-table-btn" onClick={handleFreeTable} disabled={submitting || waitingPayment}>
                Đưa bàn về Trống
              </button>
              <button onClick={onClose} disabled={submitting || paymentBusy}>Đóng</button>

              <button className="print-btn" onClick={() => window.print()} disabled={submitting}>
                In hóa đơn
              </button>

              {invoice.status === 'OPEN' && (
                <>
                  <button
                    className="cancel-invoice-btn"
                    onClick={handleCancelInvoice}
                    disabled={submitting || waitingPayment}
                  >
                    Hủy hóa đơn
                  </button>

                  {method === 'CASH' ? (
                    <button className="pay-btn" onClick={handlePay} disabled={submitting || hasPending || waitingPayment}>
                      Thanh toán
                    </button>
                  ) : (
                    <button
                      className="pay-btn"
                      onClick={handleCreatePayment}
                      disabled={submitting || hasPending || paymentBusy || waitingPayment}
                    >
                      Tạo thanh toán online
                    </button>
                  )}
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