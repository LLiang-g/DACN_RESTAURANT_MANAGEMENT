import { Client } from '@stomp/stompjs';
import SockJS from 'sockjs-client';

/**
 * Một kết nối STOMP dùng chung cho cả màn hình admin (topic /topic/admin/activity).
 * Backend phát tín hiệu mỗi khi có log mới hoặc kho thay đổi; ai đăng ký thì được báo và tự tải lại dữ liệu của mình.
 * Kết nối chỉ mở khi có ít nhất một người đăng ký, và tự đóng khi không còn ai.
 */
type ChangeListener = () => void;
type StatusListener = (connected: boolean) => void;

const changeListeners = new Set<ChangeListener>();
const statusListeners = new Set<StatusListener>();
let client: Client | null = null;
let connected = false;

function setConnected(value: boolean) {
  connected = value;
  statusListeners.forEach((listener) => listener(value));
}

function open() {
  const next = new Client({
    webSocketFactory: () => new SockJS('/ws') as unknown as WebSocket,
    reconnectDelay: 3000,
    onConnect: () => {
      setConnected(true);
      next.subscribe('/topic/admin/activity', () => changeListeners.forEach((listener) => listener()));
      // vừa (kết nối lại): tải lại để bù phần đã lỡ trong lúc mất kết nối
      changeListeners.forEach((listener) => listener());
    },
    onWebSocketClose: () => setConnected(false),
  });
  client = next;
  next.activate();
}

/**
 * @param onChanged gọi mỗi khi có thay đổi (và mỗi lần kết nối lại)
 * @param onStatus gọi khi trạng thái kết nối đổi; được gọi ngay một lần với trạng thái hiện tại
 * @returns hàm huỷ đăng ký
 */
export function subscribeAdminChanges(onChanged: ChangeListener, onStatus?: StatusListener): () => void {
  changeListeners.add(onChanged);
  if (onStatus) {
    statusListeners.add(onStatus);
    onStatus(connected);
  }
  if (!client) open();
  return () => {
    changeListeners.delete(onChanged);
    if (onStatus) statusListeners.delete(onStatus);
    if (changeListeners.size === 0 && client) {
      void client.deactivate();
      client = null;
      connected = false;
    }
  };
}
