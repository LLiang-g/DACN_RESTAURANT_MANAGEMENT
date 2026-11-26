import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import PaymentResultPage from './components/PaymentResultPage'

const isPaymentResult = window.location.pathname.replace(/\/+$/, '') === '/payment/result'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    {isPaymentResult ? <PaymentResultPage /> : <App />}
  </StrictMode>,
)
