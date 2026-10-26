import { apiClient } from './client';
import type { PendingOrder, TableOverview,InvoiceDetail, PayRequest } from '../types/pos';

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

  markReturned: (orderItemId: number) =>
    apiClient.patch(`/api/pos/order-items/${orderItemId}/return`),
  
  getInvoiceDetail: (invoiceId: number) =>
  apiClient.get<InvoiceDetail>(`/api/pos/invoices/${invoiceId}`).then((r) => r.data),

  payInvoice: (invoiceId: number, payload: PayRequest) =>
  apiClient.post(`/api/pos/invoices/${invoiceId}/pay`, payload),

  cancelInvoice: (invoiceId: number) =>
  apiClient.patch(`/api/pos/invoices/${invoiceId}/cancel`),

  freeTable: (tableId: number) =>
  apiClient.patch(`/api/pos/tables/${tableId}/free`),
};