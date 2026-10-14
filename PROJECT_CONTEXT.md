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
| Bảo mật | Spring Security + JWT (thư viện jjwt), mật khẩu băm BCrypt |
| Realtime | WebSocket (STOMP over SockJS) |
| Frontend | React.js + TypeScript + Vite. `kds` dùng thêm `@stomp/stompjs`, `sockjs-client` |
| Root package | `com.sccgroup.restaurant_management` |

Chạy dự án: backend `.\gradlew bootRun` (cổng 8080, cần MySQL và `jwt.secret` trong `application.properties`); frontend mỗi phân hệ `npm install` rồi `npm run dev` (customer cổng 5173, kds cổng 5174), mỗi cái một terminal riêng.

## 3. Cấu trúc thư mục hiện tại

```
com.sccgroup.restaurant_management/
├── frontend/
│   ├── admin
│   ├── customer
│   ├── pos
│   └── kds/                      ← xem 6.2
│       ├── vite.config.ts        ← cổng 5174, proxy /api và /ws sang 8080
│       └── src/
│           ├── api/              ← httpClient, authApi, kdsApi
│           ├── auth/             ← AuthContext, tokenStorage
│           ├── realtime/         ← kdsSocket (STOMP)
│           ├── hooks/            ← useOrders, useNow
│           ├── pages/            ← LoginPage, KitchenBoardPage
│           ├── components/       ← OrderCard, OrderItemRow, OtherStationRow, SlaTimer
│           ├── utils/            ← time.ts (SLA, định dạng giờ/ngày)
│           ├── types/, styles/
└── backend/
    ├── domain/
    │   ├── entity/          ← TOÀN BỘ 20 entity + enum của hệ thống nằm ở đây
    │   ├── repository/
    │   │   ├── account      ← KitchenAccountRepository, StaffAccountRepository, ActivityLogRepository
    │   │   ├── billing      ← InvoiceRepository
    │   │   ├── floor, menu
    │   │   ├── inventory    ← RecipeRepository, KdsStockRepository, StockTransactionRepository
    │   │   └── order        ← Order/OrderCombo/OrderItem/OrderItemOption Repository
    │   └── service/         ← InvoiceService, IngredientRequirementCalculator, ComboPriceCalculator
    ├── admin/
    │   ├── controller/
    │   ├── service/
    │   └── dto/
    ├── customer/
    │   ├── controller/
    │   ├── service/
    │   └── dto/
    ├── kds/
    │   ├── controller/      ← KdsController
    │   ├── service/         ← KdsService, KdsEventPublisher
    │   └── dto/             ← KdsOrderDto, KdsOrderItemDto
    ├── pos/
    │   ├── controller/
    │   ├── service/
    │   └── dto/
    ├── common/
    │   ├── exception/       ← ErrorResponse, ResourceNotFoundException, BusinessException, GlobalExceptionHandler
    │   └── security/        ← AppUserPrincipal, JwtUtil, JwtAuthFilter, SecurityConfig, CustomUserDetailsService, AuthController
    ├── config/
    │   ├── CorsConfig
    │   └── WebSocketConfig    ← STOMP endpoint /ws, broker /topic, prefix /app
    └── RestaurantManagementApplication
```

**Quyết định kiến trúc quan trọng**: TẤT CẢ entity đặt chung trong `domain/entity` (không tách theo module), để tránh các module phải import chéo entity của nhau. Các module (`admin`, `customer`, `kds`, `pos`) chỉ chứa `controller`, `service`, `dto` của riêng logic nghiệp vụ đó — còn `repository` của entity thì đặt trong `domain/repository/<nhóm>`. Truy vấn riêng của một module vẫn khai báo trong repository của entity đó (ví dụ truy vấn cho KDS nằm trong `OrderItemRepository`), không tạo repository trong module.

Enum được đặt **cùng file/cùng package với entity dùng nó**, không có folder enum riêng.

## 4. Trạng thái Entity (20/20 — đã tạo xong phần khai báo)

Đã có Service/Controller cho **Customer** (6.1) và **KDS** (6.2). **Admin** và **Lễ tân (pos)** chưa làm.

Tên bảng lưu ý tránh từ khóa SQL: `Table` → `restaurant_table`, `Order` → `customer_order`, `Option` → `food_option`.

| Entity | Bảng | Ghi chú |
|---|---|---|
| `RestaurantTable` | `restaurant_table` | có enum `TableStatus` |
| `Invoice` | `invoice` | enum `InvoiceStatus`, `PaymentMethod` |
| `Order` | `customer_order` | |
| `OrderCombo` | `order_combo` | |
| `OrderItem` | `order_item` | enum `OrderItemStatus` (PENDING→CONFIRMED/REJECTED→COOKING→DONE→SERVED, thêm RETURNED) — **entity trung tâm của luồng nghiệp vụ**. `note` chỉ dùng cho lý do từ chối/trả món (KHÔNG có ghi chú của khách). `started_cooking_at`, `done_at`, `served_at`, `returned_at` kiểu `DATETIME` (có cả ngày lẫn giờ, không có múi giờ) |
| `OrderItemOption` | `order_item_option` | |
| `CallStaffRequest` | `call_staff_request` | enum `CallStaffStatus` |
| `ActivityLog` | `activity_log` | không có FK thật (tham chiếu đa hình qua `accountType`/`targetType`) |
| `Category` | `category` | mỗi danh mục thuộc đúng một khu bếp (`station_id`) → món thuộc khu bếp qua danh mục |
| `Food` | `food` | `estimatedCookingTime` tính bằng **phút**, dùng cho SLA |
| `OptionGroup` | `option_group` | enum `SelectionType` |
| `Option` | `food_option` | enum `AdjustType` |
| `Combo` | `combo` | enum `DiscountType` |
| `ComboItem` + `ComboItemId` | `combo_item` | khóa chính ghép (`@EmbeddedId`) |
| `KitchenStation` | `kitchen_station` | **đã test xong** bằng `@DataJpaTest` với MySQL thật |
| `KitchenAccount` | `kitchen_account` | mỗi tài khoản bếp gắn đúng một khu bếp (`station_id`) |
| `Ingredient` | `ingredient` | dùng `BigDecimal` cho số lượng, không dùng `double`/`float` |
| `Recipe` | `recipe` | = công thức BOM (định lượng nguyên liệu/món) |
| `StockTransaction` | `stock_transaction` | lịch sử nhập/xuất/điều chỉnh kho, enum `StockTransactionType` (IMPORT/EXPORT/ADJUST); entity và enum đang nằm ở package `domain.entity.menu` |
| `StaffAccount` | `staff_account` | enum `StaffRole` (ADMIN/RECEPTIONIST), password băm bằng `BCryptPasswordEncoder` |

**Nguồn thiết kế**: `Database.dbml` + `DACN-08-Dac-Ta-Chuc-Nang.md` (đặc tả chức năng) — mọi entity đã đối chiếu khớp với 2 file này. Dữ liệu mẫu: `sample_database_26_10_9.sql`.

## 5. Hạ tầng dùng chung đã xong

### 5.1. Xử lý lỗi (`common/exception`)
- `ErrorResponse(code, message)` — định dạng JSON lỗi thống nhất toàn hệ thống
- `ResourceNotFoundException` → tự động trả HTTP 404
- `BusinessException` → tự động trả HTTP 400 (dùng cho lỗi vi phạm quy tắc nghiệp vụ, ví dụ duyệt đơn đã xử lý rồi)
- `AuthenticationException` (sai tên đăng nhập/mật khẩu) → HTTP 401, thông báo "Sai tên đăng nhập hoặc mật khẩu"
- Exception không xác định → HTTP 500 "Đã có lỗi xảy ra", **có ghi log đầy đủ** ra console
- `GlobalExceptionHandler` (`@RestControllerAdvice`) bắt exception tự động, Controller/Service **chỉ cần `throw`**, không cần tự viết `try-catch`/tự format response

### 5.2. WebSocket (`config/WebSocketConfig`)
- Endpoint bắt tay: `/ws` (dùng SockJS fallback). Hiện `/ws/**` để `permitAll` trong `SecurityConfig` (chưa kiểm tra token lúc kết nối)
- Broker: `/topic/**` (server → client, broadcast theo địa chỉ)
- Prefix: `/app/**` (client → server, ít dùng trong dự án này)
- Cách dùng: sau khi `save()` dữ liệu qua REST API, gọi `simpMessagingTemplate.convertAndSend("/topic/...", dto)` để đẩy cập nhật realtime
- **Đã gắn vào nghiệp vụ KDS**: topic chung `/topic/kds`, nội dung `{"type":"CHANGED"}`, do `KdsEventPublisher.publishChanged()` gửi (xem 6.2). Màn hình nhận được thì tải lại danh sách

### 5.3. Bảo mật / đăng nhập (`common/security`)
- **Một endpoint đăng nhập chung**: `POST /api/auth/login` body `{"username","password"}`. `CustomUserDetailsService` tra `staff_account` trước, không có thì tra `kitchen_account`.
- Phản hồi: `{token, accountType, role, stationId, stationName}`. `accountType` là `STAFF` hoặc `KITCHEN`; `role` là `ADMIN` / `RECEPTIONIST` (theo enum `StaffRole`) / `KITCHEN`; `stationId`, `stationName` chỉ có giá trị với tài khoản bếp (STAFF thì null).
- JWT hết hạn sau 8 giờ, claims: `accountId`, `accountType`, `role`, `stationId` (chỉ tài khoản bếp). Khóa ký lấy từ `jwt.secret` trong `application.properties` — phải là chuỗi **Base64** đủ dài (≥ 256 bit).
- Gửi token bằng header `Authorization: Bearer <token>`. `JwtAuthFilter` nạp lại tài khoản từ DB mỗi request. `AppUserPrincipal` mang `accountId`, `accountType`, `role`, `stationId`, `stationName`; Controller lấy bằng `@AuthenticationPrincipal AppUserPrincipal`.
- Phân quyền trong `SecurityConfig`: `/api/auth/**`, `/api/customer/**`, `/ws/**` mở; `/api/admin/**` chỉ ADMIN; `/api/pos/**` ADMIN hoặc `LE_TAN`; `/api/kds/**` ADMIN hoặc KITCHEN; còn lại cần đăng nhập. **Chú ý lệch tên vai trò, xem mục 8.**
- `KitchenAccountRepository.findByUsername` có `@EntityGraph(attributePaths = "kitchenStation")` vì `loadUserByUsername` chạy trong filter (ngoài phiên Hibernate), nạp lười sẽ gặp `LazyInitializationException`.
- Token hết hạn/sai: Spring Security trả **403** (không có nội dung), không phải 401.
- File `sql/dev_reset_passwords.sql` đặt mật khẩu mọi tài khoản mẫu thành `123456` (hash bcrypt thật). **Chỉ dùng khi phát triển.** Hash `DEMO_HASH...` trong file SQL mẫu gốc không đăng nhập được.

## 6. Tiến độ theo phân hệ

### 6.1. Customer — xem menu & gửi đơn (PENDING) — người thực hiện: **son**

**Trạng thái**: backend REST xong, đã biên dịch và unit test phần logic thuần. Chưa test tích hợp với MySQL thật.

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
- `domain/service`: `InvoiceService`, `IngredientRequirementCalculator` (tính nguyên liệu cần theo BOM + option, kiểm tra kho đủ; **KDS dùng lại để trừ kho khi nấu**), `ComboPriceCalculator`
- `domain/repository`: `floor/RestaurantTableRepository`, `billing/InvoiceRepository`, `menu/{Food,Option,Combo,ComboItem}Repository`, `inventory/RecipeRepository`, `order/{Order,OrderCombo,OrderItem,OrderItemOption}Repository`
- test: `IngredientRequirementCalculatorTest`, `ComboPriceCalculatorTest` (thuần JUnit, không cần DB)
- `src/main/resources/sample-data/customer_sample_data.sql` — dữ liệu mẫu để test khi Admin chưa xong (chạy thủ công)

**Giao diện khách (React + TypeScript, `frontend/src/customer/`)**: `types.ts`, `api.ts`, `cart.ts`, `OptionPicker.tsx`, `Modals.tsx`, `CustomerApp.tsx`, `customer.css`; `App.tsx` render `CustomerApp`. Vào bằng `http://localhost:5173/?table=<id>` (URL này chính là nội dung mã QR của bàn). `vite.config.ts` có proxy `/api` → `localhost:8080` và `host: true` để điện thoại cùng WiFi truy cập được.

**Quy tắc nghiệp vụ đã cài**:
- `InvoiceService.getOrCreateOpenInvoice()` đã xong và test qua. Khi viết Controller tạo Order **phải gọi qua hàm này**, không tự viết logic tạo Invoice riêng.
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

### 6.2. KDS — màn hình bếp — người thực hiện: **Liang**

**Trạng thái**:
- **Đã xác nhận chạy được**: đăng nhập bếp (có `stationId`, `stationName`), `GET /api/kds/orders` trả dữ liệu thật từ MySQL, frontend hiển thị dữ liệu và kết nối realtime (nhãn "Trực tiếp").
- **Đã viết, chưa ghi nhận test trên MySQL thật**: bấm Nấu (trừ kho), bấm Xong, tự động chuyển đơn kế tiếp sang nấu, tín hiệu realtime giữa nhiều tab.
- Code backend được viết khi chưa biên dịch cục bộ phía AI; mọi lỗi biên dịch/khởi động cần báo lại.

**API** (prefix `/api/kds`, cần token tài khoản `KITCHEN`; ADMIN qua được `SecurityConfig` nhưng không có khu bếp nên Nấu/Xong bị từ chối):

| Method | Đường dẫn | Mô tả |
|---|---|---|
| GET | `/orders` | Mọi order còn món `CONFIRMED`/`COOKING`/`DONE`, order cũ nhất trước. **Khu bếp nào cũng thấy hết món của mọi khu** |
| POST | `/items/{itemId}/start` | Bấm "Nấu": `CONFIRMED → COOKING`, trả 204 |
| POST | `/items/{itemId}/finish` | Bấm "Xong": `COOKING → DONE`, trả 204 |

Nấu/Xong chỉ được với món **thuộc khu bếp của tài khoản đăng nhập** (món → danh mục → khu bếp), kiểm tra ở backend; sai thì `BusinessException` "Món này không thuộc khu bếp của bạn".

**Dữ liệu trả về** (`KdsOrderDto`, field khớp kiểu `KdsOrder` ở frontend): `{id, floor, tableNumber, createdAt, items[]}`; mỗi món `KdsOrderItemDto`: `{id, foodName, quantity, status, stationId, stationName, estimatedCookingTime (phút), startedCookingAt, doneAt, options[] (tên), note (hiện luôn null), comboName (null nếu gọi lẻ)}`. Ngày giờ dạng ISO không múi giờ, ví dụ `2026-10-03T02:29:00`.

**Quy tắc nghiệp vụ đã cài (`KdsService`)**:
- **Bấm Nấu** (một giao dịch): khóa dòng món → khóa các dòng nguyên liệu theo thứ tự id → kiểm tra tồn kho thật → trừ kho bằng câu lệnh chỉ trừ khi còn đủ (BOM + option, qua `IngredientRequirementCalculator`) → ghi `StockTransaction` loại `EXPORT` (note "Nấu món #id") → đặt `status`, `started_cooking_at` → ghi `activity_log` (`START_COOKING`). Thiếu nguyên liệu → `BusinessException` "Không đủ nguyên liệu để nấu: ..." và hoàn lại toàn bộ.
- **Bấm Xong** (một giao dịch): khóa mọi món của khu mình trong order đó (theo thứ tự id, tránh khóa chéo) → `COOKING → DONE`, đặt `done_at`, ghi `activity_log` (`FINISH_COOKING`).
- **Tự động chuyển đơn kế tiếp**: nếu đó là món cuối cùng chưa xong của khu bếp mình trong order, backend tìm order **cũ nhất còn món `CONFIRMED` của khu bếp đó** (order không có món nào của khu mình tự bị bỏ qua) và chuyển mọi món `CONFIRMED` của khu mình trong order ấy sang `COOKING` (cùng quy trình trừ kho, `activity_log` hành động `AUTO_START_COOKING`, ghi tài khoản vừa bấm Xong). Món thiếu nguyên liệu thì bỏ qua và giữ `CONFIRMED`. Chỉ kích hoạt khi bấm Xong; khu bếp đang rảnh mà có đơn mới đến thì **không** tự nấu.
- **Realtime**: sau mỗi thay đổi (Nấu, Xong, tự động chuyển) `KdsEventPublisher.publishChanged()` gửi `{"type":"CHANGED"}` tới `/topic/kds` **sau khi commit** (đăng ký `afterCommit` nếu đang trong giao dịch). **Module `pos` phải gọi hàm này sau khi lễ tân duyệt/từ chối món** để bếp nhận order mới ngay.

**Frontend `frontend/kds`** (React + TypeScript + Vite, cổng 5174):
- Đăng nhập chỉ nhận tài khoản `KITCHEN` (lễ tân/admin bị từ chối). Khu bếp lấy từ tài khoản. Phiên lưu `localStorage` khóa `kds.session`; gặp 401/403 tự đăng xuất về trang đăng nhập.
- `vite.config.ts`: proxy `/api` và `/ws` sang `localhost:8080`, **xóa header `Origin`** (nếu không Spring trả 403 "Invalid CORS request" vì Host bị đổi sang 8080), `define: { global: 'globalThis' }` cho `sockjs-client`.
- Nhận realtime qua STOMP trên `/topic/kds` rồi tải lại (gộp tín hiệu trong 150ms) + tải định kỳ 30 giây dự phòng. Lỗi từ backend hiện thông báo đỏ nổi, tự ẩn sau 6 giây.
- Giao diện: dải thẻ order ngang, mỗi thẻ rộng 80% màn hình, thẻ kế bên mờ; trong thẻ là lưới **3 thẻ món mỗi hàng** (hằng số `COLUMNS` ở `OrderCard.tsx`) cho món khu mình (có nút Nấu/Xong), phía dưới là thẻ nhỏ mờ của khu bếp khác (không có nút). Món hiện: `CONFIRMED`, `COOKING`, `DONE`. Cỡ chữ co giãn theo chiều cao màn hình (`clamp` trong `.card`).
- SLA: đồng hồ đếm ngược từ `startedCookingAt` theo `estimatedCookingTime` (phút); quá 75% (`WARN_RATIO` trong `utils/time.ts`) màu cam, quá 100% đỏ và viền nhấp nháy.
- Sau khi bấm Nấu, nút Xong của món đó bị khóa 5 giây (`FINISH_LOCK_MS` trong `OrderItemRow.tsx`) để tránh bấm nhầm.
- Xong hết món khu mình trong thẻ đang xem → sau 0,7 giây (`AUTO_ADVANCE_DELAY`) tự cuộn tới đơn kế tiếp **còn món chờ nấu/đang nấu của khu mình**, bỏ qua đơn không có món của khu mình.
- Thời gian hiển thị: món xong "xong lúc HH:mm", khác ngày thì thêm "dd/MM"; đầu thẻ "Đặt N phút trước" (dưới 1 giờ), quá thì "Đặt lúc ...".
- Theme sáng: nền xanh dương nhạt, thẻ trắng; chờ nấu xanh dương, đang nấu xanh lá, đã xong xám xanh, cảnh báo cam/đỏ, chip option vàng, chip combo tím. Toàn bộ màu nằm ở khối `:root` đầu `styles/global.css`.

**Hạn chế/giả định đã biết**:
- Ghi chú của khách cho từng món **chưa có chỗ lưu** (`OrderItem.note` chỉ dùng cho lý do từ chối/trả) → thẻ món không hiện ghi chú.
- Không hiển thị `PENDING`, `REJECTED`, `SERVED`, `RETURNED`.
- Giờ bắt đầu/đồng hồ SLA chỉ là ước lượng theo lúc bấm Nấu; khu bếp rảnh thì đơn mới không tự nấu.
- Khóa nút Xong 5 giây tính theo màn hình đó, mất nếu tải lại trang.
- Chưa kiểm tra token ở bước kết nối WebSocket (ai cũng đăng ký được `/topic/kds`).

### 6.3. Admin / Lễ tân (pos)
Chưa làm. Việc cần phối hợp với KDS: lễ tân duyệt món (`PENDING → CONFIRMED`) hoặc từ chối phải gọi `kdsEventPublisher.publishChanged()` để bếp nhận đơn ngay.

## 7. Quy ước code cần tuân thủ chung

- Tiền và số lượng nguyên liệu: luôn dùng `BigDecimal`, không dùng `double`/`float`
- Ngày giờ: dùng `LocalDateTime` (java.time), không dùng `java.util.Date`
- Enum: luôn `@Enumerated(EnumType.STRING)`, không dùng mặc định (ORDINAL)
- Quan hệ `@ManyToOne`/`@OneToOne`: luôn set `fetch = FetchType.LAZY` (mặc định JPA là EAGER, dễ gây N+1 query)
- Không trả entity JPA trực tiếp ra Controller — luôn qua DTO (tránh lộ field nhạy cảm như `passwordHash`, tránh lỗi `LazyInitializationException`)
- Lỗi nghiệp vụ: `throw` `ResourceNotFoundException`/`BusinessException`, không tự viết `try-catch` trả JSON thủ công
- Truy vấn nhiều quan hệ lười cùng lúc: dùng `join fetch` hoặc `@EntityGraph` trong một câu `@Query` để tránh N+1
- Khóa dòng (`PESSIMISTIC_WRITE`): luôn khóa theo thứ tự id tăng dần để tránh khóa chéo (deadlock). Khi khóa, dùng truy vấn con thay vì `join` để không khóa luôn các bảng được join
- Đẩy realtime: gọi `KdsEventPublisher.publishChanged()` (tự chờ commit), không tự `convertAndSend` giữa chừng giao dịch
- Mỗi `Repository` chỉ cần khai báo interface kế thừa `JpaRepository`; muốn thêm truy vấn thì khai báo hàm `findByTênField...` hoặc `@Query` (JPQL dùng tên class/field Java, không dùng tên bảng/cột)
- Repository của một entity chỉ đặt **một bản** trong `domain/repository/<nhóm>` (từng có `InvoiceRepository` bị trùng ở `domain/repository` và `domain/repository/billing` gây lỗi trùng bean; bản đúng là `billing`)

## 8. Việc tồn đọng / cần cả nhóm thống nhất

1. **Tên vai trò lễ tân không khớp**: `StaffRole` (và dữ liệu mẫu) là `RECEPTIONIST`, nhưng `SecurityConfig` cho `/api/pos/**` theo `hasAnyRole("ADMIN", "LE_TAN")` → tài khoản lễ tân sẽ bị chặn. Cần chọn một tên và sửa cho đồng nhất.
2. **Trạng thái hủy món**: `OrderItemStatus` chưa có trạng thái hủy (`CANCELLED`) dù đặc tả cho khách hủy khi món chưa nấu; tổng hóa đơn và báo cáo "tỷ lệ hủy" cần phân biệt được.
3. **Ghi chú của khách** cho từng món: thêm cột (ví dụ `customer_note`) vào `order_item` nếu muốn KDS hiển thị.
4. **Độ chính xác số**: entity khai báo `precision = 10, scale = 2` cho `Ingredient.stockQuantity`, `Recipe.quantityRequired`, `StockTransaction.quantity`, trong khi `sample_database_26_10_9.sql` dùng `DECIMAL(12,3)`. Nếu Hibernate tự sinh bảng thì số lẻ 3 chữ số bị làm tròn.
5. **WebSocket chưa xác thực**: `/ws/**` đang `permitAll`; nên kiểm tra token khi kết nối trước khi triển khai thật.
6. **Múi giờ**: thời điểm lưu là giờ máy chủ, không kèm múi giờ; khi triển khai nên đặt múi giờ JVM (ví dụ `Asia/Ho_Chi_Minh`).
7. **Lễ tân phải gọi** `KdsEventPublisher.publishChanged()` sau khi duyệt/từ chối món (xem 6.2, 6.3).
