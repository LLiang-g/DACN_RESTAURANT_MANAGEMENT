import { Client } from "@stomp/stompjs"
import SockJS from "sockjs-client"

/**
 * Nghe tín hiệu "dữ liệu của bàn đã thay đổi" (STOMP over SockJS, topic /topic/table/{tableId}).
 * onChanged được gọi mỗi khi có tín hiệu và cả khi vừa kết nối lại để bù phần đã lỡ.
 * @returns hàm ngắt kết nối
 */
export function connectTableSocket(tableId: number, onChanged: () => void): () => void {
  const client = new Client({
    webSocketFactory: () => new SockJS("/ws") as unknown as WebSocket,
    reconnectDelay: 3000,
    onConnect: () => {
      client.subscribe(`/topic/table/${tableId}`, () => onChanged())
      onChanged()
    },
  })
  client.activate()
  return () => {
    void client.deactivate()
  }
}
