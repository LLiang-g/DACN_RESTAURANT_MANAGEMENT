# Phân hệ Khách hàng (Customer)

Người làm: **son**. Khách quét mã QR dán tại bàn, xem thực đơn, gọi món, theo dõi hóa đơn, hủy món và gọi nhân viên. Không cần đăng nhập.

---

## 1. Cách chạy

### Yêu cầu
- Java 21, MySQL, Node.js (bản có `npm`).
- Cơ sở dữ liệu `smart_pos_kds` đã nạp file `sample_database_*.sql` của dự án.

### Chạy backend (cổng 8080)
Ở thư mục gốc dự án:

```powershell
.\gradlew.bat bootRun
```

Cấu hình kết nối DB nằm ở `src/main/resources/application.properties` (tên DB, tài khoản, mật khẩu). Nếu thời gian "còn ~N phút" của món đang nấu bị lệch, kiểm tra tham số `serverTimezone` trong dòng `spring.datasource.url` (xem mục 7).

### Chạy giao diện khách (cổng 5173)
Mở terminal thứ hai:

```powershell
cd frontend\customer
npm install
npm run dev
```

Lần đầu hoặc sau khi `package.json` đổi thì cần `npm install`.

### Mở trang khách
Mỗi mã QR trỏ tới đường dẫn có số bàn:

```
http://localhost:5173/?table=<số bàn>
```

Ví dụ `http://localhost:5173/?table=1`. Số bàn là `id` trong bảng `restaurant_table`. Không có `?table=` thì trang hiện "Vui lòng quét mã QR trên bàn để gọi món".

Để mở trên điện thoại cùng mạng Wi-Fi, dùng địa chỉ Network mà Vite in ra (ví dụ `http://192.168.x.x:5173/?table=1`). Giao diện gọi `/api` qua proxy của Vite nên không bị lỗi CORS.

---

## 2. Danh sách API đầy đủ

Tất cả bắt đầu bằng `http://localhost:8080` (hoặc qua proxy Vite: `http://localhost:5173`). Mọi API dưới `/api/customer/**` mở công khai.

| Chức năng | Phương thức và đường dẫn | Ghi chú |
| --- | --- | --- |
| Thông tin bàn | `GET /api/customer/tables/{tableId}` | Trả `id`, `floor`, `tableNumber` |
| Xem thực đơn | `GET /api/customer/menu` | Danh mục, món, combo; kèm `available` và `remainingPortions` ("còn N suất") |
| Chi tiết món và option | `GET /api/customer/foods/{foodId}` | Nhóm option, phụ thu giá (`priceDelta`) |
| Gửi đơn | `POST /api/customer/orders` | Mỗi lần gửi tạo một Order mới ở trạng thái PENDING |
| Xem hóa đơn của bàn | `GET /api/customer/tables/{tableId}/invoice` | Mọi đơn của hóa đơn đang mở, trạng thái từng món, tổng tạm tính |
| Hủy một món | `POST /api/customer/tables/{tableId}/order-items/{orderItemId}/cancel` | Chỉ khi món ở PENDING hoặc CONFIRMED |
| Hủy cả đơn | `POST /api/customer/tables/{tableId}/orders/{orderId}/cancel` | Chỉ khi mọi món còn hiệu lực của đơn đều PENDING hoặc CONFIRMED |
| Gọi nhân viên | `POST /api/customer/tables/{tableId}/call-staff` | Không tạo trùng nếu bàn đã có yêu cầu chưa xử lý |

### Dữ liệu gửi đơn (`POST /api/customer/orders`)

```json
{
  "tableId": 1,
  "items": [
    { "foodId": 53, "quantity": 2, "optionIds": [14] }
  ],
  "combos": [
    {
      "comboId": 3,
      "quantity": 1,
      "items": [
        { "foodId": 34, "optionIds": [] }
      ]
    }
  ]
}
```

- `items`: món lẻ; `optionIds` là `id` trong bảng `food_option`.
- `combos`: combo; `items` là lựa chọn option cho từng món con (món con không chọn option thì bỏ qua).
- Nhóm option `SINGLE_CHOICE` bắt buộc chọn đúng một, `MULTI_CHOICE` tùy chọn. Server kiểm tra lại cả hai.

### Lỗi trả về
Mọi lỗi nghiệp vụ trả JSON `{"code": "...", "message": "..."}`:
- `404`: không tìm thấy bàn, đơn hoặc món.
- `400`: vi phạm quy tắc, ví dụ món vừa hết hàng, bếp đã bắt đầu nấu nên không hủy được.

---

## 3. WebSocket (cập nhật tức thời)

Điểm kết nối: `http://localhost:8080/ws` (STOMP qua SockJS; giao diện khách gọi qua proxy `/ws`).

| Kênh | Ai nghe | Khi nào có tín hiệu |
| --- | --- | --- |
| `/topic/table/{tableId}` | Màn hình khách của bàn đó | Gửi đơn, hủy, gọi nhân viên, bếp bấm Nấu hoặc Xong |
| `/topic/pos` | Màn hình lễ tân (do người làm phần Lễ tân đăng ký) | `ORDER_PLACED`, `ORDER_CANCELLED_BY_CUSTOMER`, `CALL_STAFF`, kèm `tableId` |

Tín hiệu chỉ báo "có thay đổi", không kèm nội dung. Nơi nhận tự tải lại dữ liệu. Giao diện khách còn tự tải lại hóa đơn mỗi 15 giây để dự phòng khi mất kết nối.

---

## 4. Những gì có trong trang khách

### Màn hình chính
- **Tiêu đề:** "Gọi món", kèm số bàn và tầng.
- **Hàng nút:** `🧾 Hóa đơn` và `🔔 Gọi nhân viên`. Khi đang xem hóa đơn, có thêm nút mũi tên `←` để quay lại thực đơn.
- **Thanh danh mục:** Combo (nếu có) và các danh mục món, cuộn ngang một hàng. Bên dưới là thanh trượt mảnh có con trượt vuông màu cam (kéo được hoặc bấm vào vạch).
- **Danh sách món:** mỗi thẻ gồm ảnh, tên, mô tả, giá, thời gian chế biến dự kiến, số suất còn lại. Món hết hàng hiện chữ đỏ "Tạm hết" và không bấm được.
- **Combo:** hiện giá gốc gạch ngang, giá sau giảm và danh sách món con.
- **Thanh giỏ hàng:** hiện dưới đáy khi giỏ có món (số món và tổng tiền).
- **Nút mũi tên ↑ (góc phải dưới):** cuộn về đầu trang, chỉ hiện khi đã cuộn xuống.

### Chọn món
Bấm vào thẻ món hoặc combo để mở biểu mẫu giữa màn hình: chọn option (size, topping, độ cay), chọn số lượng, bấm "Thêm · tổng tiền". Sau khi thêm hiện thông báo "✓ Thêm thành công" giữa màn hình rồi tự biến mất. Trong combo, mỗi món con có bộ chọn option riêng.

### Giỏ hàng và gửi đơn
Bấm thanh giỏ hàng để xem, tăng giảm số lượng, rồi "Gửi đơn". Gửi xong hiện "Đã gửi đơn ✓" với hai nút: "Xem hóa đơn" và "Gọi thêm món". Mỗi lần gửi tạo một đơn mới, không gộp vào đơn cũ.

### Trang hóa đơn
Thay thế phần thực đơn khi bấm `🧾 Hóa đơn`:
- Mỗi đơn là một ô vuông riêng, có thanh tiêu đề "Đơn #số · giờ", đơn mới nhất ở trên đầu.
- Mỗi món hiện nhãn trạng thái: Chờ duyệt, Đã duyệt chờ bếp, Đang nấu (kèm "Dự kiến còn ~N phút"), Đã xong, Đã phục vụ, Bị từ chối (kèm lý do), Đã trả lại, Đã hủy (khách tự hủy).
- Nút "Hủy" cho từng món và "Hủy cả đơn" chỉ hiện khi bếp chưa bấm Nấu. Hủy một món thuộc combo sẽ hủy cả combo.
- Cuối trang: "Tạm tính" tổng tiền (bỏ món bị từ chối, bị hủy, đã trả lại) và dòng "Thanh toán tại quầy".
- Trạng thái tự cập nhật qua WebSocket, không cần tải lại trang.

### Gọi nhân viên
Bấm `🔔 Gọi nhân viên` để gửi yêu cầu kèm số bàn tới lễ tân. Bấm lại khi yêu cầu cũ chưa được xử lý thì chỉ thông báo "Nhân viên đã nhận yêu cầu", không tạo thêm.

---

## 5. Vị trí code

### Backend: `src/main/java/com/sccgroup/restaurant_management/`

| File | Việc |
| --- | --- |
| `customer/controller/CustomerMenuController.java` | `GET` bàn, thực đơn, chi tiết món |
| `customer/controller/CustomerOrderController.java` | `POST` gửi đơn |
| `customer/controller/CustomerTableController.java` | Hóa đơn, hủy món, hủy đơn, gọi nhân viên |
| `customer/service/CustomerMenuService.java` | Dựng thực đơn, tính còn/hết và "còn N suất" |
| `customer/service/CustomerOrderService.java` | Kiểm tra và tạo Order, tính giá, khóa bàn và nguyên liệu |
| `customer/service/CustomerInvoiceService.java` | Dựng hóa đơn, hủy món/đơn, tính thời gian nấu còn lại |
| `customer/service/CustomerCallStaffService.java` | Tạo yêu cầu gọi nhân viên |
| `customer/dto/` | Dữ liệu request và response |
| `domain/service/ComboPriceCalculator.java` | Giá combo: `FIXED` = số tiền giảm, `PERCENT` = giảm theo % |
| `domain/service/IngredientRequirementCalculator.java` | Tính nguyên liệu cần cho món (gồm option) |
| `domain/service/StockReservationService.java` | Nguyên liệu đang "giữ chỗ" cho đơn chưa nấu |
| `domain/service/InvoiceService.java` | Tạo hoặc lấy hóa đơn mở của bàn |
| `domain/service/InvoiceAutoCancelService.java` | Tự hủy hóa đơn rỗng sau khoảng chờ, trả bàn về trống |
| `domain/service/TableEventPublisher.java` | Gửi tín hiệu WebSocket cho khách và lễ tân |
| `config/WebSocketConfig.java` | Cấu hình `/ws`, các kênh `/topic` |

### Giao diện: `frontend/customer/`

| File | Việc |
| --- | --- |
| `vite.config.ts` | Cổng 5173, proxy `/api` và `/ws` sang cổng 8080 |
| `src/App.tsx` | Trang chính: thực đơn, giỏ hàng, chuyển sang hóa đơn |
| `src/App.css`, `src/index.css` | Giao diện |
| `src/api/api.ts` | Gọi các API khách |
| `src/store/cart.ts` | Giỏ hàng, tính tiền, đóng gói dữ liệu gửi đơn |
| `src/types/types.ts` | Kiểu dữ liệu TypeScript |
| `src/components/CategoryTabs.tsx` | Thanh danh mục và thanh trượt cam |
| `src/components/Modals.tsx` | Biểu mẫu chọn món, combo và khung popup |
| `src/components/OptionPicker.tsx` | Chọn size, topping, độ cay |
| `src/components/InvoicePage.tsx` | Trang hóa đơn |
| `src/components/ScrollToTopButton.tsx` | Nút mũi tên về đầu trang |
| `src/realtime/tableSocket.ts` | Nghe tín hiệu `/topic/table/{id}` |

---

## 6. Quy tắc nghiệp vụ quan trọng

- Gửi đơn tạo Order ở trạng thái `PENDING`. Order đầu tiên của bàn tự tạo hóa đơn mở và chuyển bàn sang đang phục vụ; các đơn sau gộp vào cùng hóa đơn.
- Còn hay hết hàng do hệ thống tự tính: so tồn kho (trừ phần đã giữ chỗ cho đơn chưa nấu) với định lượng nguyên liệu, gồm cả option. Combo hết khi một món con hết.
- Nguyên liệu chỉ bị trừ khi bếp bấm "Nấu". Đó cũng là mốc cuối để khách còn hủy được.
- Khách hủy món: món chuyển `REJECTED` kèm ghi chú "Khách tự hủy" (schema không có trạng thái hủy riêng).
- Hóa đơn không còn đơn hợp lệ sẽ tự hủy sau `app.invoice.empty-grace-minutes` phút (mặc định 10), bàn về trạng thái trống.
- Giá: đơn giá món đã cộng phụ thu option. Giá combo = tổng giá món con trừ `discountValue` (loại `FIXED`), hoặc giảm theo phần trăm (loại `PERCENT`). Món con của combo chỉ tính phụ thu option.

---

## 7. Lỗi thường gặp

| Hiện tượng | Nguyên nhân và cách xử lý |
| --- | --- |
| "Đã có lỗi xảy ra" khi mở trang | Backend lỗi 500. Xem terminal chạy `bootRun`, tìm dòng `Caused by` |
| Trang báo lỗi đọc dữ liệu, không gọi được API | Thiếu proxy trong `vite.config.ts`, hoặc backend chưa chạy ở cổng 8080 |
| Backend không khởi động, báo trùng tên bean | Hai class cùng tên, ví dụ hai `RealtimeEventPublisher`. Class của phần Customer tên là `TableEventPublisher` |
| Món đang nấu hiện sai thời gian còn lại (hiện đủ thời gian chuẩn) | Lệch múi giờ giữa MySQL và Java. Đổi `serverTimezone=UTC` thành `serverTimezone=Asia/Ho_Chi_Minh` trong `application.properties`, chạy lại backend |
| Không vào được từ điện thoại | Dùng địa chỉ Network (IP Wi-Fi) mà Vite in ra; máy tính và điện thoại phải cùng mạng |
| Giao diện không đổi sau khi sửa CSS | Nhấn Ctrl+F5 để tải lại không dùng bộ nhớ đệm |

---

## 8. Dữ liệu test

Hai file `test_orders_sample.sql` và `test_orders_cleanup.sql` tạo và xóa dữ liệu mẫu cho bàn 2–7 (đơn chờ duyệt, đã duyệt, đang nấu, đã xong, đã phục vụ, bị từ chối, combo). Chạy file sample, rồi mở `?table=<2..7>` để xem từng trường hợp.
