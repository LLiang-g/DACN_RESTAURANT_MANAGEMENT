import type { InvoiceDetail } from '../types/pos';

interface Props {
  invoice: InvoiceDetail;
}

export default function InvoiceReceipt({ invoice }: Props) {
  const printedAt = new Date().toLocaleString('vi-VN');

  return (
    <div className="print-receipt">
      <div className="receipt-header">
        <h2>SMART POS & KDS</h2>
        <p>Hóa đơn thanh toán</p>
      </div>

      <div className="receipt-meta">
        <p>Bàn: {invoice.tableNumber} — Tầng {invoice.floor}</p>
        <p>Mã hóa đơn: #{invoice.invoiceId}</p>
        <p>In lúc: {printedAt}</p>
      </div>

      <table className="receipt-table">
        <thead>
          <tr>
            <th>Món</th>
            <th>SL</th>
            <th>Thành tiền</th>
          </tr>
        </thead>
        <tbody>
          {invoice.items.map((item) => (
            <tr key={`r-item-${item.orderItemId}`}>
              <td>{item.foodName}</td>
              <td>{item.quantity}</td>
              <td>{item.lineTotal.toLocaleString('vi-VN')}đ</td>
            </tr>
          ))}
          {invoice.combos.map((combo) => (
            <tr key={`r-combo-${combo.orderComboId}`}>
              <td>{combo.comboName} (combo)</td>
              <td>{combo.quantity}</td>
              <td>{combo.lineTotal.toLocaleString('vi-VN')}đ</td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="receipt-total">
        <strong>Tổng cộng: {invoice.totalAmount.toLocaleString('vi-VN')}đ</strong>
      </div>

      {invoice.status === 'PAID' && (
        <div className="receipt-payment">
          <p>Phương thức: {invoice.paymentMethod === 'CASH' ? 'Tiền mặt' : 'Chuyển khoản (VietQR)'}</p>
          {invoice.paymentMethod === 'CASH' && (
            <>
              <p>Khách đưa: {invoice.amountReceived?.toLocaleString('vi-VN')}đ</p>
              <p>Tiền thối: {invoice.changeAmount?.toLocaleString('vi-VN')}đ</p>
            </>
          )}
          {invoice.paymentMethod === 'BANK_TRANSFER' && (
            <p>Mã giao dịch: {invoice.bankTransactionRef}</p>
          )}
          {invoice.paidAt && <p>Thanh toán lúc: {new Date(invoice.paidAt).toLocaleString('vi-VN')}</p>}
        </div>
      )}

      <div className="receipt-footer">
        <p>Cảm ơn quý khách — hẹn gặp lại!</p>
      </div>
    </div>
  );
}