export type OrderItemStatus =
  | 'PENDING'
  | 'CONFIRMED'
  | 'REJECTED'
  | 'COOKING'
  | 'DONE'
  | 'SERVED'
  | 'RETURNED';

export interface KitchenStation {
  id: number;
  name: string;
}

export interface KdsOrderItem {
  id: number;
  foodName: string;
  quantity: number;
  status: OrderItemStatus;
  stationId: number;
  stationName: string;
  /** Thời gian chế biến dự kiến, đơn vị phút (food.estimated_cooking_time) */
  estimatedCookingTime: number | null;
  startedCookingAt: string | null;
  doneAt: string | null;
  /** Tên các option khách đã chọn (không hành, thêm phần...) */
  options: string[];
  note: string | null;
  /** Có giá trị nếu món thuộc một lần gọi combo */
  comboName: string | null;
}

export interface KdsOrder {
  id: number;
  floor: string;
  tableNumber: string;
  createdAt: string;
  items: KdsOrderItem[];
}

/** Phiên đăng nhập của tài khoản khu bếp, lưu trong localStorage. */
export interface Session {
  token: string;
  username: string;
  stationId: number;
  stationName: string;
}
