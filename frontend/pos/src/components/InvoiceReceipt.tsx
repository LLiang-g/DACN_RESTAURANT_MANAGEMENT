import { createPortal } from 'react-dom';
import type { InvoiceDetail } from '../types/pos';
import './InvoiceReceipt.css';

const BILLABLE = new Set(['CONFIRMED', 'COOKING', 'DONE', 'SERVED']);
const money = (value: number) => `${value.toLocaleString('vi-VN')}đ`;
const cents = (value: number) => Math.round(value * 100);
const validMoney = (value: number | null | undefined): value is number => typeof value === 'number' && Number.isFinite(value) && value >= 0;
const removed = (status: string) => status === 'REJECTED' || status === 'RETURNED';

export function receiptError(invoice: InvoiceDetail): string | null {
  if (invoice.status === 'CANCELLED') return 'Hóa đơn đã hủy, không thể in phiếu thanh toán.';
  if (invoice.items.some(i => i.status === 'PENDING') || invoice.combos.some(c => c.items.some(i => i.status === 'PENDING')))
    return 'Hãy duyệt hoặc từ chối hết món trước khi in phiếu tạm tính.';
  const singles = invoice.items.filter(i => BILLABLE.has(i.status));
  const combos = invoice.combos.filter(c => c.items.some(i => BILLABLE.has(i.status)));
  if (!validMoney(invoice.totalAmount) || singles.some(i => !validMoney(i.lineTotal)) || combos.some(c =>
    !validMoney(c.lineTotal) || !validMoney(c.baseTotal) || !validMoney(c.removedDeduction) || !Number.isFinite(c.optionSurcharge)))
    return 'Thiếu dữ liệu số tiền để in. Hãy cập nhật Backend và tải lại hóa đơn.';
  const sum = singles.reduce((n, i) => n + cents(i.lineTotal), 0) + combos.reduce((n, c) => n + cents(c.lineTotal), 0);
  if (sum !== cents(invoice.totalAmount) || combos.some(c => cents(c.baseTotal) - cents(c.removedDeduction) + cents(c.optionSurcharge) !== cents(c.lineTotal)))
    return 'Thành tiền các dòng không khớp tổng. Hãy kiểm tra lại hóa đơn trước khi in.';
  if (invoice.status === 'PAID') {
    if (!validMoney(invoice.paidAmount) || cents(invoice.paidAmount) !== cents(invoice.totalAmount))
      return 'Số tiền đã nhận chưa được xác minh hoặc khác tổng hiện tại. Cần kiểm tra trước khi in hóa đơn.';
    if (!invoice.paidAt || !Number.isFinite(new Date(invoice.paidAt).getTime())) return 'Thiếu thời điểm thanh toán để in hóa đơn.';
    if (invoice.paymentMethod === 'CASH') {
      if (!validMoney(invoice.amountReceived) || !validMoney(invoice.changeAmount) || cents(invoice.amountReceived) - cents(invoice.changeAmount) !== cents(invoice.paidAmount))
        return 'Tiền khách đưa và tiền thối chưa khớp số tiền đã nhận.';
    } else if (invoice.paymentMethod !== 'BANK_TRANSFER' || !invoice.bankTransactionRef?.trim()) return 'Thiếu thông tin phương thức hoặc mã giao dịch thanh toán.';
  }
  return null;
}

export default function InvoiceReceipt({ invoice }: { invoice: InvoiceDetail }) {
  if (receiptError(invoice)) return null;
  const paid = invoice.status === 'PAID';
  const singles = invoice.items.filter(i => BILLABLE.has(i.status));
  const combos = invoice.combos.filter(c => c.items.some(i => BILLABLE.has(i.status)));
  return createPortal(<div className="print-receipt" data-receipt-kind={paid ? 'paid' : 'provisional'}>
    <header className="receipt-header"><h2>SMART POS &amp; KDS</h2><h3>{paid ? 'HÓA ĐƠN THANH TOÁN' : 'PHIẾU TẠM TÍNH'}</h3><p className="receipt-state">{paid ? 'ĐÃ THANH TOÁN' : 'CHƯA THANH TOÁN'}</p></header>
    <div className="receipt-meta"><p>Bàn: {invoice.tableNumber} · {invoice.floor}</p><p>Mã hóa đơn: #{invoice.invoiceId}</p><p>In lúc: {new Date().toLocaleString('vi-VN')}</p></div>
    <table className="receipt-table"><thead><tr><th>Món</th><th>SL</th><th>Thành tiền</th></tr></thead><tbody>
      {singles.map(i => <tr key={`item-${i.orderItemId}`}><td>{i.foodName}</td><td>{i.quantity}</td><td>{money(i.lineTotal)}</td></tr>)}
      {combos.map(c => <tr key={`combo-${c.orderComboId}`}><td colSpan={3}><div className="receipt-combo-line"><strong>{c.comboName} (combo) × {c.quantity}</strong><strong>{money(c.lineTotal)}</strong></div>
        <div className="receipt-combo-detail"><div><span>Giá combo × số lượng</span><span>{money(c.baseTotal)}</span></div>
          {c.removedDeduction > 0 && <div><span>Giảm món bị loại</span><span>−{money(c.removedDeduction)}</span></div>}
          {c.optionSurcharge !== 0 && <div><span>Điều chỉnh Option còn lại</span><span>{c.optionSurcharge > 0 ? '+' : '−'}{money(Math.abs(c.optionSurcharge))}</span></div>}
          {c.items.some(i => removed(i.status)) && <p>Đã loại: {c.items.filter(i => removed(i.status)).map(i => `${i.foodName} × ${i.quantity}`).join('; ')}</p>}
        </div></td></tr>)}
    </tbody></table>
    {singles.length === 0 && combos.length === 0 && <p>Không có món tính tiền.</p>}
    <div className="receipt-total"><strong>{paid ? 'Tổng thanh toán' : 'Tổng tạm tính'}: {money(invoice.totalAmount)}</strong></div>
    {paid ? <div className="receipt-payment"><p>Phương thức: {invoice.paymentMethod === 'CASH' ? 'Tiền mặt' : 'Chuyển khoản online'}</p>
      {invoice.paymentMethod === 'CASH' && <><p>Tiền khách đưa: {money(invoice.amountReceived!)}</p><p>Tiền thối lại: {money(invoice.changeAmount!)}</p></>}
      <p><strong>Số tiền đã nhận: {money(invoice.paidAmount!)}</strong></p>
      {invoice.paymentMethod === 'BANK_TRANSFER' && <p>Mã tham chiếu: {invoice.bankTransactionRef}</p>}
      <p>Thanh toán lúc: {new Date(invoice.paidAt!).toLocaleString('vi-VN')}</p>
    </div> : <p className="receipt-note">Phiếu kiểm tra món và số tiền dự kiến, chưa xác nhận đã thu tiền.</p>}
    <footer className="receipt-footer"><p>Không tính tiền món đã hủy, từ chối hoặc trả lại.</p><p>{paid ? 'Cảm ơn quý khách — hẹn gặp lại!' : 'Vui lòng kiểm tra và thanh toán tại quầy.'}</p></footer>
  </div>, document.body);
}
