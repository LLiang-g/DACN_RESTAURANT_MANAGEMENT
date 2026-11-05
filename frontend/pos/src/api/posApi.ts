import { apiClient } from './client';
import type {
  PendingOrder, TableOverview, InvoiceDetail, PayRequest, CallStaffRequest,
  PaymentResponse, PaymentProviderType,
} from '../types/pos';

export const posApi = {
  getPendingOrders: () =>
    apiClient.get<PendingOrder[]>('/api/pos/orders/pending').then((r) => r.data),

  getTableOverview: () =>
    apiClient.get<TableOverview[]>('/api/pos/tables').then((r) => r.data),

  approveItem: (orderItemId: number) =>
    apiClient.patch(`/api/pos/order-items/${orderItemId}/approve`),

  rejectItem: (orderItemId: number, reason: string) =>
    apiClient.patch(`/api/pos/order-items/${orderItemId}/reject`, { reason }),

  markServed: (orderItemId: number) =>
    apiClient.patch(`/api/pos/order-items/${orderItemId}/served`),

  markReturned: (orderItemId: number, reason: string) =>
    apiClient.patch(`/api/pos/order-items/${orderItemId}/return`, { reason }),
  
  getInvoiceDetail: (invoiceId: number) =>
  apiClient.get<InvoiceDetail>(`/api/pos/invoices/${invoiceId}`).then((r) => r.data),

  payInvoice: (invoiceId: number, payload: PayRequest) =>
  apiClient.post(`/api/pos/invoices/${invoiceId}/pay`, payload),

  cancelInvoice: (invoiceId: number) =>
  apiClient.patch(`/api/pos/invoices/${invoiceId}/cancel`),

  freeTable: (tableId: number) =>
  apiClient.patch(`/api/pos/tables/${tableId}/free`),

  getPendingCallStaffRequests: () =>
  apiClient.get<CallStaffRequest[]>('/api/pos/call-staff-requests/pending').then((res) => res.data),

  resolveCallStaffRequest: (requestId: number) =>
    apiClient.patch(`/api/pos/call-staff-requests/${requestId}/resolve`),

  undoReturnItem: (orderItemId: number) =>
  apiClient.patch(`/api/pos/order-items/${orderItemId}/undo-return`),
  
  createPayment: (invoiceId: number, provider: PaymentProviderType) =>
    apiClient
      .post<PaymentResponse>(`/api/pos/invoices/${invoiceId}/payments`, { provider })
      .then((r) => r.data),

  getPendingPayment: (invoiceId: number) =>
    apiClient.get<PaymentResponse | null>(`/api/pos/invoices/${invoiceId}/payments/pending`)
      .then((r) => r.status === 204 ? null : r.data),

  reconcilePayment: (txnRef: string) =>
    apiClient.post<PaymentResponse>(`/api/pos/payments/${txnRef}/reconcile`).then(r => r.data),

  getPayment: (txnRef: string) =>
    apiClient.get<PaymentResponse>(`/api/pos/payments/${txnRef}`).then((r) => r.data),

  mockConfirmPayment: (txnRef: string) =>
    apiClient.post(`/api/pos/payments/${txnRef}/mock-confirm`),
};