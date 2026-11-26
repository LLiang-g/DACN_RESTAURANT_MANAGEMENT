import { useEffect, useState } from 'react'
import { getPaymentResult, paymentResultPresentation, PaymentResultError, type CustomerPaymentResult } from '../api/paymentResult'
import './PaymentResultPage.css'

const token = new URLSearchParams(window.location.hash.slice(1)).get('token') ?? ''
export default function PaymentResultPage() {
  const [result,setResult] = useState<CustomerPaymentResult|null>(null)
  const [error,setError] = useState('')
  const [busy,setBusy] = useState(false)
  const [attemptVersion,setAttemptVersion] = useState(0)
  const [waitingLong,setWaitingLong] = useState(false)
  useEffect(() => {
    document.title = 'Kết quả thanh toán — Smart Dining'
    if (!token) { setError('Không có liên kết kết quả hợp lệ. Vui lòng quét lại mã bàn hoặc liên hệ nhân viên.'); return }
    let active = true, attempts = 0
    let timer: ReturnType<typeof setTimeout> | undefined
    let controller: AbortController | undefined
    setWaitingLong(false)
    const check = async () => {
      if (!active) return
      attempts++
      controller = new AbortController()
      const deadline = setTimeout(() => controller?.abort(),10000)
      setBusy(true)
      let again = true
      try {
        const latest = await getPaymentResult(token,controller.signal)
        if (!active) return
        setResult(latest);setError('')
        again = !(latest.paymentStatus === 'FAILED' || (latest.paymentStatus === 'SUCCESS' && latest.invoiceStatus !== 'OPEN'))
      } catch (caught) {
        if (!active) return
        setError(caught instanceof PaymentResultError ? caught.message : 'Chưa kết nối được với nhà hàng. Kết quả vẫn chưa rõ; bạn có thể kiểm tra lại.')
        if (caught instanceof PaymentResultError && ['PAYMENT_RESULT_TOKEN_INVALID','PAYMENT_RESULT_LINK_EXPIRED','NOT_FOUND'].includes(caught.code??'')) again = false
      } finally {
        clearTimeout(deadline)
        if (active) setBusy(false)
      }
      if (!active) return
      if (again && attempts < 20) timer = setTimeout(check,3000)
      else if (again) setWaitingLong(true)
    }
    void check()
    return () => { active=false;clearTimeout(timer);controller?.abort() }
  },[attemptVersion])
  const presentation = result ? paymentResultPresentation(result) : null
  return <main className="payment-result-page">
    <header className="payment-result-brand"><span aria-hidden="true">S·</span><div><strong>SMART DINING</strong><small>Gọi món tại bàn</small></div></header>
    <section className={`payment-result-card ${presentation?.tone??'pending'}`}>
      <p className="payment-result-eyebrow">KẾT QUẢ THANH TOÁN</p>
      <div className="payment-result-symbol" aria-hidden="true">{presentation?.tone==='success'?'✓':presentation?.tone==='failed'?'!':'…'}</div>
      <div role="status" aria-live="polite"><h1>{presentation?.title ?? (error?'Chưa xác minh được kết quả':'Đang lấy kết quả từ nhà hàng')}</h1>{presentation&&<p className="payment-result-description">{presentation.description}</p>}</div>
      {result&&<dl><div><dt>Giá trị giao dịch QR</dt><dd>{result.amount.toLocaleString('vi-VN')}đ</dd></div><div><dt>Mã tham chiếu</dt><dd>{result.txnRef}</dd></div><div><dt>Hóa đơn tại nhà hàng</dt><dd>{({OPEN:'Chưa hoàn tất thanh toán',PAID:'Đã thanh toán',CANCELLED:'Đã hủy'})[result.invoiceStatus]}</dd></div></dl>}
      {error&&<p className="payment-result-error" role="alert">{error}</p>}
      {waitingLong&&<p className="payment-result-note">Chưa có xác nhận mới sau các lần kiểm tra. Bạn có thể kiểm tra lại hoặc nhờ nhân viên hỗ trợ; trang này không tự chuyển giao dịch thành thất bại.</p>}
      <div className="payment-result-actions">{token&&<button disabled={busy} onClick={()=>setAttemptVersion(v=>v+1)}>{busy?'Đang kiểm tra…':'Kiểm tra lại'}</button>}{result&&<a href={`/?table=${result.tableId}`}>Về thực đơn bàn</a>}</div>
      <p className="payment-result-note">Bạn có thể đưa màn hình này cho nhân viên. Nếu tiền đã bị trừ nhưng nhà hàng chưa xác nhận, hãy cung cấp mã giao dịch để kiểm tra.</p>
    </section>
  </main>
}
