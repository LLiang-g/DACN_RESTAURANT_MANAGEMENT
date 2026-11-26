export type PaymentState = 'PENDING' | 'RECONCILING' | 'EXPIRED' | 'SUCCESS' | 'FAILED'
export interface CustomerPaymentResult {
  txnRef: string
  amount: number
  paymentStatus: PaymentState
  invoiceStatus: 'OPEN' | 'PAID' | 'CANCELLED'
  tableId: number
  returnHint: 'RETURNED' | 'CANCELLED' | 'UNSUCCESSFUL'
  needsAttention: boolean
}
export class PaymentResultError extends Error {
  readonly code?: string
  constructor(message: string, code?: string) { super(message); this.code = code }
}
export async function getPaymentResult(token: string, signal: AbortSignal): Promise<CustomerPaymentResult> {
  const response = await fetch('/api/payments/vnpay/result', {
    headers: { 'X-Payment-Result-Token': token }, signal, cache: 'no-store',
  })
  if (!response.ok) {
    let body: { message?: string; code?: string } = {}
    try { body = await response.json() } catch { /* Keep a readable fallback without exposing raw HTML. */ }
    throw new PaymentResultError(body.message ?? 'Chưa lấy được kết quả từ nhà hàng. Vui lòng thử kiểm tra lại.', body.code)
  }
  const result = await response.json() as CustomerPaymentResult
  if (typeof result.txnRef !== 'string' || typeof result.amount !== 'number' || !Number.isFinite(result.amount) || result.amount < 0
      || !['PENDING','RECONCILING','EXPIRED','SUCCESS','FAILED'].includes(result.paymentStatus)
      || !['OPEN','PAID','CANCELLED'].includes(result.invoiceStatus)
      || !Number.isSafeInteger(result.tableId) || result.tableId <= 0 || typeof result.needsAttention !== 'boolean') {
    throw new PaymentResultError('Dữ liệu kết quả chưa đầy đủ. Vui lòng kiểm tra với nhân viên.')
  }
  return result
}
export function paymentResultPresentation(result: CustomerPaymentResult) {
  if (result.paymentStatus === 'SUCCESS') {
    if (result.invoiceStatus === 'CANCELLED' || result.needsAttention) return {
      tone:'attention', title:'Đã nhận tiền, cần đối chiếu',
      description:'Nhà hàng đã nhận thông tin tiền về. Vui lòng liên hệ nhân viên để đối chiếu hóa đơn và xử lý khoản cần hoàn nếu có.',
    }
    if (result.invoiceStatus === 'PAID') return {
      tone:'success', title:'Thanh toán đã được xác nhận',
      description:'Nhà hàng đã ghi nhận giao dịch và hóa đơn đã thanh toán. Cảm ơn bạn đã dùng bữa!',
    }
    return { tone:'attention',title:'Tiền đã về, hóa đơn đang xử lý',description:'Giao dịch đã được xác nhận có tiền về. Nhân viên đang kiểm tra để hoàn tất hóa đơn; vui lòng không trả lại khoản này.' }
  }
  if (result.invoiceStatus === 'PAID') return {
    tone:'attention',title:'Hóa đơn đã được thanh toán',
    description:'Nhà hàng đã ghi nhận thanh toán hóa đơn, nhưng giao dịch QR này chưa có kết quả thành công. Hãy hỏi nhân viên trước khi thanh toán thêm.',
  }
  if (result.invoiceStatus === 'CANCELLED') return {tone:'attention',title:'Hóa đơn đã hủy',description:'Giao dịch QR này chưa được xác nhận nhận tiền. Nếu tài khoản của bạn đã bị trừ tiền, vui lòng liên hệ nhân viên để kiểm tra.'}
  if (result.paymentStatus === 'FAILED') return {tone:'failed',title:'Giao dịch chưa thành công',description:'Nhà hàng đã nhận kết quả giao dịch không thành công. Vui lòng liên hệ nhân viên nếu cần mã thanh toán khác hoặc đổi phương thức.'}
  return {
    tone:'pending',title:'Đang xác nhận thanh toán',
    description:result.returnHint === 'CANCELLED'
      ? 'Bạn đã chọn hủy trên cổng thanh toán. Nhà hàng đang chờ xác nhận cuối của giao dịch.'
      : result.returnHint === 'UNSUCCESSFUL'
        ? 'Cổng thanh toán báo chưa hoàn tất. Nhà hàng đang kiểm tra trạng thái giao dịch; chưa thể kết luận đã nhận tiền.'
        : 'Nhà hàng chưa nhận được xác nhận thanh toán cuối cùng. Thông tin chuyển về từ trình duyệt không thay thế xác nhận tiền của Backend.',
  }
}
