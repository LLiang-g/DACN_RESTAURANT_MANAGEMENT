ghi lại tiến trình làm

Tổ Quốc ghi công:
- thiết kế database: Lượng 
- vẽ sơ đồ các luồng dữ liệu : Lượng
- Làm đề cương : Khánh 
- thiết lập cây thư mục tổng quát cho backend: Khánh
- tạo đầy đủ file markdown để định hình quy chuẩn cũng như thống nhất xuyên suốt project : Khánh
- cấu hình websocket, thiết lập bắt ngoại lệ tổng quát, jwt authentication : khánh
- giao diện của customer : sơn , Như ( đang làm )
  - bản giao diện khách hàng thô sơ, customer gọi món, lưu order vào database : sơn 
  - 

Thứ tự nên làm :

    Admin: tạo dữ liệu nền để các module sau có cái để test :  (An, Nam) 
    Customer: xem menu và gửi đơn, tạo ra Order ở trạng thái PENDING : (Sơn, Như)
    
    Lễ tân: duyệt đơn, hóa đơn, thanh toán.
    KDS: nấu, trừ kho, hoàn thành.
    WebSocket đưa vào sau khi luồng REST đã chạy ổn.
    Quy tắc nâng cao: hết hàng tự động, gộp hóa đơn, nhật ký hoạt động.




## 6. Tiến độ theo phân hệ

### 6.1. Customer — xem menu & gửi đơn (PENDING) — người thực hiện: **son**

**Trạng thái**: backend REST xong, đã biên dịch và unit test phần logic thuần. Chưa test tích hợp với MySQL thật; chưa có giao diện React.

**API** (không cần đăng nhập, prefix `/api/customer`):

| Method | Đường dẫn | Mô tả |
|---|---|---|
| GET | `/tables/{tableId}` | Xác nhận bàn từ QR, trả tầng + số bàn (404 nếu không có) |
| GET | `/menu` | Danh mục + món (kèm `available`, `hasOptions`) và danh sách combo (kèm giá, `available`) |
| GET | `/foods/{foodId}` | Chi tiết món + nhóm tùy chọn (`priceDelta` đã quy về 0 nếu không đổi giá) |
| POST | `/orders` | Gửi đơn → tạo **một Order mới**, mọi OrderItem ở `PENDING`, trả 201 |

**Body `POST /orders`**:
```json
{
  "tableId": 1,
  "items":  [ { "foodId": 1, "quantity": 2, "optionIds": [3, 4] } ],
  "combos": [ { "comboId": 1, "quantity": 1,
                "items": [ { "foodId": 1, "optionIds": [2] } ] } ]
}
```

**File đã tạo**:
- `customer/controller`: `CustomerMenuController`, `CustomerOrderController`
- `customer/service`: `CustomerMenuService`, `CustomerOrderService`
- `customer/dto`: `TableInfoResponse`, `MenuResponse`, `FoodDetailResponse`, `PlaceOrderRequest`, `OrderResponse`
- `domain/service`: `IngredientRequirementCalculator` (tính nguyên liệu cần theo BOM + option, kiểm tra kho đủ), `ComboPriceCalculator`
- `domain/repository`: `floor/RestaurantTableRepository`, `billing/InvoiceRepository`, `menu/{Food,Option,Combo,ComboItem}Repository`, `inventory/RecipeRepository`, `order/{Order,OrderCombo,OrderItem,OrderItemOption}Repository`
- test: `IngredientRequirementCalculatorTest`, `ComboPriceCalculatorTest` (thuần JUnit, không cần DB)
- `src/main/resources/sample-data/customer_sample_data.sql` — dữ liệu mẫu để test khi Admin chưa xong (chạy thủ công)

**Giao diện khách (React + TypeScript, `frontend/src/customer/`)**: `types.ts`, `api.ts`, `cart.ts`, `OptionPicker.tsx`, `Modals.tsx`, `CustomerApp.tsx`, `customer.css`; `App.tsx` render `CustomerApp`. Không thêm thư viện mới. Vào bằng `http://localhost:5173/?table=<id>` (URL này chính là nội dung mã QR của bàn). `vite.config.ts` có proxy `/api` → `localhost:8080` và `host: true` để điện thoại cùng WiFi truy cập được.

