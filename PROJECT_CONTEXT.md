# Bối cảnh dự án — Restaurant Management (DACN-08-Nhom4D)

> File này dùng để cung cấp ngữ cảnh cho AI hỗ trợ code. Đưa nguyên file này vào đầu cuộc trò chuyện với AI để nó hiểu hiện trạng dự án trước khi hỏi/nhờ việc.

## 1. Tổng quan

- **Tên đề tài**: Hệ thống Quản lý Nhà hàng, Gọi món không chạm & Điều phối bếp thông minh (Smart POS & Realtime KDS)
- **Đồ án chuyên ngành**, nhóm DACN-08-Nhom4D, Khoa CNTT — Đại học Sài Gòn, 12 tuần
- **4 phân hệ nghiệp vụ**:
  - **Customer** — khách quét QR tại bàn, xem menu, gửi đơn, gọi nhân viên (không cần đăng nhập)
  - **KDS** (bếp) — theo khu bếp, nhận đơn đã duyệt, nấu, đánh dấu hoàn thành, trừ kho tự động
  - **Lễ tân (pos)** — duyệt/từ chối đơn trước khi xuống bếp, quản lý bàn/hóa đơn, thanh toán VietQR, xử lý gọi nhân viên
  - **Admin** — quản lý danh mục, món ăn, combo, nguyên vật liệu, công thức (BOM), tài khoản, bàn ăn, nhật ký hoạt động

## 2. Công nghệ

| Thành phần | Công nghệ |
|---|---|
| Backend | Spring Boot 3.4.5, Java 21, Gradle (Kotlin DSL) |
| Database | MySQL, Spring Data JPA/Hibernate |
| Realtime | WebSocket (STOMP over SockJS) |
| Frontend | React.js |
| Root package | `com.sccgroup.restaurant_management` |

## 3. Cấu trúc thư mục hiện tại

```
com.sccgroup.restaurant_management/
├── frontend/
│   ├── admin
│   ├── customer
│   ├── pos
│   └── kds
└── backend/
    ├── domain/
    │   ├── entity/          ← TOÀN BỘ 20 entity + enum của hệ thống nằm ở đây
    │   ├──repository/
    │   ├── account    ← KitchenAccountRepository, StaffAccountRepository
    │   ├── menu
    │   └──service    ← InvoiceService
    ├── admin/
    │   ├── controller/
    │   ├── service/
    │   └── dto/
    ├── customer/
    │   ├── controller/       
    │   ├── service/          
    │   └── dto/
    ├── kds/
    │   ├── controller/       
    │   ├── service/          
    │   └── dto/
    ├── pos/
    │   ├── controller/      
    │   ├── service/          
    │   └── dto/ 
    ├── common/
    │   ├──exception/        ← ErrorResponse, ResourceNotFoundException, BusinessException, GlobalExceptionHandler
    │   ├──security/      ← AppUserPrincipal, JwtUtil,JwtAuthFilter,SecurityConfig,CustomUserDetailsService,AuthController
    │     
    ├── config/
    │   ├── CorsConfig
    │   └── WebSocketConfig    ← STOMP endpoint /ws, broker /topic, prefix /app
    └── RestaurantManagementApplication
```

**Quyết định kiến trúc quan trọng**: TẤT CẢ entity đặt chung trong `domain/entity` (không tách theo module), để tránh các module phải import chéo entity của nhau. Các module (`admin`, `customer`, `kds`, `pos`) chỉ chứa `controller`, `service`, `dto`, `repository` của riêng logic nghiệp vụ đó — còn `repository` của entity thì đặt cạnh entity trong `domain`.

Enum được đặt **cùng file/cùng package với entity dùng nó**, không có folder enum riêng.

## 4. Trạng thái Entity (20/20 — đã tạo xong phần khai báo, CHƯA viết Repository/Service/Controller cho đa số)

Tên bảng lưu ý tránh từ khóa SQL: `Table` → `restaurant_table`, `Order` → `customer_order`, `Option` → `food_option`.

| Entity | Bảng | Ghi chú |
|---|---|---|
| `RestaurantTable` | `restaurant_table` | có enum `TableStatus` |
| `Invoice` | `invoice` | enum `InvoiceStatus`, `PaymentMethod` |
| `Order` | `customer_order` | |
| `OrderCombo` | `order_combo` | |
| `OrderItem` | `order_item` | enum `OrderItemStatus` (PENDING→CONFIRMED/REJECTED→COOKING→DONE→SERVED) — **entity trung tâm của luồng nghiệp vụ** |
| `OrderItemOption` | `order_item_option` | |
| `CallStaffRequest` | `call_staff_request` | enum `CallStaffStatus` |
| `ActivityLog` | `activity_log` | không có FK thật (tham chiếu đa hình qua `accountType`/`targetType`) |
| `Category` | `category` | |
| `Food` | `food` | |
| `OptionGroup` | `option_group` | enum `SelectionType` |
| `Option` | `food_option` | enum `AdjustType` |
| `Combo` | `combo` | enum `DiscountType` |
| `ComboItem` + `ComboItemId` | `combo_item` | khóa chính ghép (`@EmbeddedId`) |
| `KitchenStation` | `kitchen_station` | **đã test xong** bằng `@DataJpaTest` với MySQL thật |
| `KitchenAccount` | `kitchen_account` | |
| `Ingredient` | `ingredient` | dùng `BigDecimal` cho số lượng, không dùng `double`/`float` |
| `Recipe` | `recipe` | = công thức BOM (định lượng nguyên liệu/món) |
| `StockTransaction` | `stock_transaction` | lịch sử nhập/xuất/điều chỉnh kho, enum `StockTransactionType` |
| `StaffAccount` | `staff_account` | enum `StaffRole` (ADMIN/LE_TAN), password phải băm bằng `BCryptPasswordEncoder`, chưa làm |

**Nguồn thiết kế**: `Database.dbml` + `DACN-08-Dac-Ta-Chuc-Nang.md` (đặc tả chức năng) — mọi entity đã đối chiếu khớp với 2 file này.

## 5. Hạ tầng dùng chung đã xong

### 5.1. Xử lý lỗi (`common/exception`)
- `ErrorResponse(code, message)` — định dạng JSON lỗi thống nhất toàn hệ thống
- `ResourceNotFoundException` → tự động trả HTTP 404
- `BusinessException` → tự động trả HTTP 400 (dùng cho lỗi vi phạm quy tắc nghiệp vụ, ví dụ duyệt đơn đã xử lý rồi)
- `GlobalExceptionHandler` (`@RestControllerAdvice`) bắt exception tự động, Controller/Service **chỉ cần `throw`**, không cần tự viết `try-catch`/tự format response

### 5.2. WebSocket (`config/WebSocketConfig`)
- Endpoint bắt tay: `/ws` (dùng SockJS fallback)
- Broker: `/topic/**` (server → client, broadcast theo địa chỉ, ví dụ `/topic/kds/{stationId}`)
- Prefix: `/app/**` (client → server, ít dùng trong dự án này)
- Cách dùng: sau khi `save()` dữ liệu qua REST API, gọi `simpMessagingTemplate.convertAndSend("/topic/...", dto)` để đẩy cập nhật realtime
- Đã test thông bằng REST + STOMP client HTML tạm thời — **hạ tầng đã xác nhận chạy được, chưa gắn vào nghiệp vụ thật**



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

**Quy tắc nghiệp vụ đã cài**:
- Mỗi lần gửi đơn = một `Order` mới, không gộp vào Order cũ.
- Gộp hóa đơn: bàn chưa có `Invoice` `OPEN` → tự tạo + chuyển bàn sang `DANG_PHUC_VU`; có rồi → gắn Order vào hóa đơn đó. Khóa dòng bàn (`PESSIMISTIC_WRITE`) để 2 khách cùng bàn không tạo 2 hóa đơn.
- Giá chốt tại server, không nhận giá từ client: món lẻ `unitPrice = price + Σ priceDelta` của option đã chọn.
- Kiểm tra: số lượng 1–99; option phải thuộc đúng món; nhóm `SINGLE_CHOICE` chỉ chọn một; món con gửi lên phải thuộc combo.
- Còn/hết hàng suy ra từ kho (không có công tắc thủ công); combo hết nếu một món con hết. Khi gửi đơn, cộng dồn nguyên liệu cả đơn (gồm `scaleFactor`, option ADD/REMOVE); thiếu → `BusinessException` "Món ... hiện tạm hết". **Không trừ kho** ở bước này (chỉ trừ khi bếp bấm "Nấu").

**Quy ước dữ liệu mà Lễ tân/Thanh toán cần biết**:
- `Combo` không có cột giá: `FIXED` → `discountValue` là **giá bán của combo**; `PERCENT` → giá = tổng giá món con × (1 − %/100), làm tròn đồng. Logic ở `ComboPriceCalculator` (nếu Admin hiểu `FIXED` là "số tiền giảm" thì chỉ cần sửa một chỗ này).
- Món trong combo: `OrderItem.unitPrice` = **chỉ phụ thu option** (vd. nâng size), giá gốc đã nằm trong `OrderCombo.comboPrice`. Nên **tổng hóa đơn = Σ(unitPrice × quantity của OrderItem) + Σ(comboPrice × quantity của OrderCombo)** (bỏ các món `REJECTED`/đã hủy).
- Trạng thái món nằm ở `OrderItem` (Order không có cột status); "Order PENDING" = mọi OrderItem của nó đang `PENDING`.

**Chưa làm (thuộc Customer, làm sau)**: theo dõi trạng thái đơn realtime, thời gian chế biến còn lại, hủy đơn, gọi nhân viên, đẩy WebSocket báo Lễ tân có đơn mới.

**Giả định/hạn chế đã biết**:
- Schema chưa có hệ số quy đổi đơn vị kho ↔ công thức → code giả định cùng đơn vị.
- Schema chưa có cờ "bắt buộc chọn" cho nhóm option → không ép khách phải chọn size.
- Kiểm tra tồn kho lúc gửi đơn chỉ so với tồn hiện tại, chưa trừ phần các đơn PENDING khác đang chờ (vì kho chỉ trừ lúc "Nấu").

## 7. Quy ước code cần tuân thủ chung

- Tiền và số lượng nguyên liệu: luôn dùng `BigDecimal`, không dùng `double`/`float`
- Ngày giờ: dùng `LocalDateTime` (java.time), không dùng `java.util.Date`
- Enum: luôn `@Enumerated(EnumType.STRING)`, không dùng mặc định (ORDINAL)
- Quan hệ `@ManyToOne`/`@OneToOne`: luôn set `fetch = FetchType.LAZY` (mặc định JPA là EAGER, dễ gây N+1 query)
- Không trả entity JPA trực tiếp ra Controller — luôn qua DTO (tránh lộ field nhạy cảm như `passwordHash`, tránh lỗi `LazyInitializationException`)
- Lỗi nghiệp vụ: `throw` `ResourceNotFoundException`/`BusinessException`, không tự viết `try-catch` trả JSON thủ công
