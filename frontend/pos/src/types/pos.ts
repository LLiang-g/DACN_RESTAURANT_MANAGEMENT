export interface PendingOrderItem {
  orderItemId: number;
  foodId: number;
  foodName: string;
  quantity: number;
  note: string | null;
  unitPrice: number;
  options: string[];
}

export interface PendingOrder {
  orderId: number;
  tableId: number;
  tableNumber: string;
  floor: string;
  createdAt: string;
  items: PendingOrderItem[];
}

export interface TableOverview {
  tableId: number;
  tableNumber: string;
  floor: string;
  status: 'AVAILABLE' | 'SERVING';
  invoiceId: number | null;
  openedAt: string | null;
}

export interface InvoiceItem {
  orderItemId: number;
  foodName: string;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
  status: string;
}

export interface InvoiceComboItem {
  foodName: string;
  quantity: number;
  status: string;
}

export interface InvoiceCombo {
  orderComboId: number;
  comboName: string;
  quantity: number;
  comboPrice: number;
  lineTotal: number;
  items: InvoiceComboItem[];
}

export interface InvoiceDetail {
  invoiceId: number;
  tableId: number;
  tableNumber: string;
  floor: string;
  status: 'OPEN' | 'PAID' | 'CANCELLED';
  items: InvoiceItem[];
  combos: InvoiceCombo[];
  totalAmount: number;
}

export type PaymentMethod = 'CASH' | 'BANK_TRANSFER';

export interface PayRequest {
  paymentMethod: PaymentMethod;
  amountReceived?: number;
  bankTransactionRef?: string;
}

export interface CallStaffRequest {
  requestId: number;
  tableId: number;
  tableNumber: string;
  floor: string;
  createdAt: string;
}